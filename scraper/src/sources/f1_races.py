"""Formula 1 races from the Jolpica API (the maintained Ergast successor).

This is a JSON API rather than a scrape, so there is no HTML to break and no
per-page crawl budget. It still goes through `src.fetcher`, which checks
robots.txt and throttles — `api.jolpi.ca/robots.txt` sets `Allow: /` for the
wildcard user agent, alongside `Content-Signal: search=yes,ai-train=no`.
We honour `ai-train=no`: race facts are fed to Gemini as reference material for
original prose, never used as training data.

Attribution is required by the upstream data licence and is rendered by the
blog, not just recorded here — see `scorecard.attribution`.

One race becomes one `raw_matches` document. Unlike cricket, a race has no two
`teams`: the field is the whole grid, so `teams` stays empty and `standings`
carries the finishing order.
"""

import json
from collections import defaultdict

from src import fetcher

API_ROOT = "https://api.jolpi.ca/ergast/f1"
COMPETITION = "Formula 1"
FORMAT = "Grand Prix"
ATTRIBUTION = "Race data via the Jolpica F1 API (Ergast successor)"

# The results endpoint caps `limit` at 100 regardless of what we ask for, and a
# season is ~480 result rows, so it has to be paged through.
PAGE_SIZE = 100
MAX_PAGES = 12

# Championship context is only accurate for the *upcoming* race — quoting
# today's table inside a report on round 3 would be an anachronism.
STANDINGS_IN_PREVIEW = 5


def _get_json(url: str) -> dict:
    return json.loads(fetcher.get(url).text)


def _mr_data(url: str) -> dict:
    return _get_json(url)["MRData"]


def fetch_recent_matches() -> list[dict]:
    schedule = _mr_data(f"{API_ROOT}/current.json?limit={PAGE_SIZE}")
    races = schedule["RaceTable"]["Races"]
    if not races:
        return []

    season = schedule["RaceTable"]["season"]
    results_by_round = _fetch_season_results(season)
    standings = _fetch_driver_standings(season)

    documents = []
    for race in races:
        results = results_by_round.get(race["round"])
        documents.append(
            _build_document(race, season, results, standings if results is None else None)
        )
    return documents


def _fetch_season_results(season: str) -> dict[str, list[dict]]:
    """Finishing order per round. Races can straddle a page boundary, so rows
    are accumulated by round rather than trusting one page to hold a whole race.
    """
    by_round: dict[str, list[dict]] = defaultdict(list)

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        data = _mr_data(
            f"{API_ROOT}/{season}/results.json?limit={PAGE_SIZE}&offset={offset}"
        )
        races = data["RaceTable"]["Races"]
        if not races:
            break

        for race in races:
            by_round[race["round"]].extend(race.get("Results", []))

        if offset + PAGE_SIZE >= int(data["total"]):
            break

    return dict(by_round)


def _fetch_driver_standings(season: str) -> list[dict]:
    data = _mr_data(f"{API_ROOT}/{season}/driverstandings.json")
    lists = data["StandingsTable"]["StandingsLists"]
    return lists[0]["DriverStandings"] if lists else []


def _driver_name(driver: dict) -> str:
    return f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip()


def _result_detail(result: dict) -> str:
    """Finishing time for classified runners, retirement reason for the rest."""
    status = result.get("status", "")
    time = (result.get("Time") or {}).get("time")

    if time:
        laps = result.get("laps")
        return f"{time} ({laps} laps)" if laps else time

    # "Finished" without a time means classified but lapped; anything else is a
    # retirement and the status *is* the interesting detail.
    return status or "No time"


def _build_document(
    race: dict, season: str, results: list[dict] | None, standings: list[dict] | None
) -> dict:
    circuit = race.get("Circuit", {})
    location = circuit.get("Location", {})
    round_no = race["round"]
    race_name = race["raceName"]

    venue = ", ".join(
        part
        for part in (
            circuit.get("circuitName"),
            location.get("locality"),
            location.get("country"),
        )
        if part
    )

    scorecard: dict = {
        "status": "completed" if results else "upcoming",
        "season": season,
        "round": int(round_no),
        "circuitName": circuit.get("circuitName", ""),
        "country": location.get("country", ""),
        "locality": location.get("locality", ""),
        "raceTimeUtc": race.get("time", ""),
        "sessions": _sessions(race),
        "attribution": ATTRIBUTION,
        "referenceUrl": race.get("url", ""),
    }

    if results:
        scorecard["winner"] = _driver_name(results[0]["Driver"])
        scorecard["winningConstructor"] = results[0].get("Constructor", {}).get("name", "")
        scorecard["podium"] = [_driver_name(r["Driver"]) for r in results[:3]]
        scorecard["fastestLap"] = _fastest_lap(results)
        scorecard["classifiedRunners"] = sum(
            1 for r in results if (r.get("Time") or {}).get("time")
        )
        scorecard["retirements"] = [
            {"name": _driver_name(r["Driver"]), "reason": r.get("status", "")}
            for r in results
            if not (r.get("Time") or {}).get("time")
        ]

    if standings:
        scorecard["championshipStandings"] = [
            {
                "position": int(s["position"]),
                "name": _driver_name(s["Driver"]),
                "team": (s.get("Constructors") or [{}])[0].get("name", ""),
                "points": float(s["points"]),
            }
            for s in standings[:STANDINGS_IN_PREVIEW]
        ]

    return {
        "sport": "motorsport",
        # The results endpoint for this round is both stable and unique, which is
        # what `save_raw_match` upserts on.
        "sourceUrl": f"{API_ROOT}/{season}/{round_no}/results.json",
        "matchTitle": f"Round {round_no}: {race_name}",
        "competition": f"{COMPETITION} {season}",
        "teams": [],
        "venue": venue,
        "date": race.get("date", ""),
        "format": FORMAT,
        "scorecard": scorecard,
        "playerPerformances": [],
        "standings": _standings(results),
        # Never populated for this source: the API serves data, not imagery.
        "sourceImages": [],
    }


def _sessions(race: dict) -> dict[str, str]:
    """Practice/qualifying/sprint times, which are what a race preview leads on."""
    keys = ("FirstPractice", "SecondPractice", "ThirdPractice", "SprintQualifying", "Sprint", "Qualifying")
    sessions = {}
    for key in keys:
        session = race.get(key)
        if session and session.get("date"):
            sessions[key] = f"{session['date']} {session.get('time', '')}".strip()
    return sessions


def _fastest_lap(results: list[dict]) -> dict | None:
    for result in results:
        lap = result.get("FastestLap") or {}
        if lap.get("rank") == "1":
            return {
                "name": _driver_name(result["Driver"]),
                "time": (lap.get("Time") or {}).get("time", ""),
                "lap": lap.get("lap", ""),
            }
    return None


def _standings(results: list[dict] | None) -> list[dict]:
    if not results:
        return []

    return [
        {
            "position": int(result["position"]),
            "name": _driver_name(result["Driver"]),
            "team": result.get("Constructor", {}).get("name", ""),
            "detail": _result_detail(result),
            "points": float(result.get("points", 0)),
        }
        for result in results
    ]
