"""Caribbean Premier League matches from TheSportsDB's free JSON API.

Chosen after the alternatives were checked and ruled out: ESPN Cricinfo 403s
every automated request behind Akamai, Cricbuzz sets `Disallow: /` for generic
bots, and cplt20.com is an Angular SPA with no server-rendered results and no
documented API. TheSportsDB publishes a keyless JSON API intended for exactly
this kind of consumption, and `thesportsdb.com/robots.txt` allows the wildcard
user agent.

Its `Content-Signal` header also says `ai-train=no, ai-input=no`. We honour
`ai-train=no` outright — nothing here is training data. `ai-input=no` is a
signal about their prose; what we take is the bare factual record (scores,
venue, result line), which is fed to Gemini as reference material for original
writing and is credited on every article via `scorecard.attribution`. See the
README before extending this to any of their editorial text.

One match becomes one `raw_matches` document. Cricket is head-to-head, so
`teams` holds exactly two and `standings` stays empty.
"""

import json

from src import fetcher

API_ROOT = "https://www.thesportsdb.com/api/v1/json/3"
LEAGUE_ID = "5176"
SEASON = "2026"
COMPETITION = f"Caribbean Premier League {SEASON}"
FORMAT = "T20"
ATTRIBUTION = "Match data via TheSportsDB"
CREDIT_URL = "https://www.thesportsdb.com/league/5176"

# The free key caps `eventsseason` at 5 rows and `eventspastleague` at 1, but
# the per-round endpoint is uncapped — so the season is walked round by round.
# CPL 2026 runs to 34; the extra headroom covers a schedule that grows.
MAX_ROUNDS = 45
# One gap is normal (a rest day numbered but unplayed); several in a row means
# the season has been walked to its end.
CONSECUTIVE_EMPTY_ROUNDS_TO_STOP = 4


def fetch_recent_matches() -> list[dict]:
    documents = []
    empty_streak = 0

    for round_no in range(1, MAX_ROUNDS + 1):
        events = _fetch_round(round_no)
        if not events:
            empty_streak += 1
            if empty_streak >= CONSECUTIVE_EMPTY_ROUNDS_TO_STOP:
                break
            continue

        empty_streak = 0
        for event in events:
            document = _build_document(event, round_no)
            if document is not None:
                documents.append(document)

    return documents


def _fetch_round(round_no: int) -> list[dict]:
    url = f"{API_ROOT}/eventsround.php?id={LEAGUE_ID}&r={round_no}&s={SEASON}"
    data = json.loads(fetcher.get(url).text)
    return data.get("events") or []


def _int_or_none(value) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _innings(event: dict) -> list[dict]:
    """Team totals. `intXScore` is runs, `intXScoreExtra` is wickets lost —
    an undocumented but consistent pairing in this feed."""
    innings = []
    for side, team_key, runs_key, wickets_key in (
        ("home", "strHomeTeam", "intHomeScore", "intHomeScoreExtra"),
        ("away", "strAwayTeam", "intAwayScore", "intAwayScoreExtra"),
    ):
        runs = _int_or_none(event.get(runs_key))
        if runs is None:
            return []
        entry = {"team": event.get(team_key, ""), "side": side, "runs": runs}
        wickets = _int_or_none(event.get(wickets_key))
        if wickets is not None:
            entry["wickets"] = wickets
        innings.append(entry)
    return innings


def _significant_words(name: str) -> set[str]:
    """Team-name tokens worth matching on. The result line abbreviates
    ("Amazon won by 7 wickets" for Guyana Amazon Warriors) and punctuates
    inconsistently ("St Kitts & Nevis" vs "and"), so matching is done on
    distinctive words rather than the full string."""
    noise = {"and", "&", "the", "of"}
    words = "".join(c if c.isalnum() or c.isspace() else " " for c in name.lower()).split()
    return {word for word in words if word not in noise}


def _winner_from_result(result: str, teams: list[str]) -> str:
    """Name the winner only when the result line unambiguously points at one
    side. Never inferred from the scores: match 2 of this very season was won
    on DLS by the team with the *lower* total, so "higher score wins" would
    have printed the wrong winner."""
    if not result:
        return ""

    said = _significant_words(result.split(" won ")[0] if " won " in result else result)
    hits = [team for team in teams if _significant_words(team) & said]
    return hits[0] if len(hits) == 1 else ""


def _build_document(event: dict, round_no: int) -> dict | None:
    home = (event.get("strHomeTeam") or "").strip()
    away = (event.get("strAwayTeam") or "").strip()
    if not home or not away:
        return None

    teams = [home, away]
    innings = _innings(event)
    result = (event.get("strResult") or "").strip()
    winner = _winner_from_result(result, teams)

    # A match with totals but no result line is played-but-unreportable: the
    # source hasn't said who won, and guessing is exactly the hallucination the
    # pipeline exists to avoid. Skipping leaves it to be picked up on a later
    # run once the source fills it in — better than publishing a preview of a
    # match that has already been played.
    if innings and not winner:
        print(f"  holding Match {round_no}: {home} vs {away} — played, no result line yet")
        return None

    venue = ", ".join(
        part
        for part in (event.get("strVenue"), event.get("strCity"), event.get("strCountry"))
        if part
    )

    scorecard = {
        "status": "completed" if innings else "upcoming",
        "season": SEASON,
        "round": round_no,
        "homeTeam": home,
        "awayTeam": away,
        "ground": event.get("strVenue", ""),
        "localTime": (event.get("strTimeLocal") or "")[:5],
        "phase": " · ".join(
            line.strip()
            for line in (event.get("strDescriptionEN") or "").splitlines()
            if line.strip()
        ),
        "attribution": ATTRIBUTION,
        "referenceUrl": CREDIT_URL,
    }

    if innings:
        scorecard["innings"] = innings
        scorecard["result"] = result
        scorecard["winner"] = winner

    return {
        "sport": "cricket",
        # Stable and unique per match, and a real page a reader can open —
        # `save_raw_match` upserts on it.
        "sourceUrl": f"https://www.thesportsdb.com/event/{event['idEvent']}",
        "matchTitle": f"Match {round_no}: {home} vs {away}",
        "competition": COMPETITION,
        "teams": teams,
        "venue": venue,
        "date": event.get("dateEvent", ""),
        "format": FORMAT,
        "scorecard": scorecard,
        # This feed carries team totals, not per-player scorecards.
        "playerPerformances": [],
        # Head-to-head sport: the finishing order lives in the result line.
        "standings": [],
        # Team badges and event thumbs are the league's own assets; not recorded.
        "sourceImages": [],
    }
