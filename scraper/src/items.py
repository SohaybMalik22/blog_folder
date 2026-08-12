"""Validation before persistence — Scrapy's item-pipeline role.

Keeps malformed scrapes out of MongoDB so the content-generation step never
feeds Gemini a half-parsed fixture.
"""

# Keep in sync with the `Sport` union in packages/types/src/index.ts and the
# `sport` enums in packages/db/src/models — a value accepted here but missing
# there fails silently at generation time, not at scrape time.
VALID_SPORTS = {"cricket", "motorsport"}

VALID_FORMATS = {
    "cricket": {"T20", "ODI", "Test"},
    "motorsport": {"Grand Prix", "Sprint"},
}

# Head-to-head sports name two teams; field sports (a 20-car grid) name none and
# carry the finishing order in `standings` instead.
HEAD_TO_HEAD_SPORTS = {"cricket"}

REQUIRED_FIELDS = ("sourceUrl", "matchTitle", "format")


class InvalidMatch(Exception):
    pass


def validate_match(match: dict) -> dict:
    sport = match.setdefault("sport", "cricket")
    if sport not in VALID_SPORTS:
        raise InvalidMatch(f"unknown sport {sport}")

    for field in REQUIRED_FIELDS:
        if not match.get(field):
            raise InvalidMatch(f"missing {field}")

    _validate_competitors(match, sport)

    if match["format"] not in VALID_FORMATS[sport]:
        raise InvalidMatch(f"unknown {sport} format {match['format']}")

    match["sourceImages"] = [url for url in match.get("sourceImages", []) if url.startswith("http")]
    match.setdefault("standings", [])
    match.setdefault("playerPerformances", [])
    match.setdefault("competition", "")

    return match


def _validate_competitors(match: dict, sport: str) -> None:
    teams = match.get("teams") or []

    if sport in HEAD_TO_HEAD_SPORTS:
        if len(teams) != 2:
            raise InvalidMatch(f"expected 2 teams, got {teams}")
        if any(not team.strip() for team in teams):
            raise InvalidMatch(f"blank team name in {teams}")
        return

    if teams:
        raise InvalidMatch(f"{sport} events carry no teams, got {teams}")

    # An unraced event legitimately has an empty grid, so standings may be empty
    # — but any entry present must be usable.
    for entry in match.get("standings") or []:
        if not str(entry.get("name", "")).strip():
            raise InvalidMatch(f"blank competitor name in standings of {match['matchTitle']}")
        if not isinstance(entry.get("position"), int):
            raise InvalidMatch(f"non-integer position in standings of {match['matchTitle']}")
