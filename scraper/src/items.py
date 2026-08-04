"""Validation before persistence — Scrapy's item-pipeline role.

Keeps malformed scrapes out of MongoDB so the content-generation step never
feeds Gemini a half-parsed fixture.
"""

VALID_FORMATS = {"T20", "ODI", "Test"}

REQUIRED_FIELDS = ("sourceUrl", "matchTitle", "teams", "format")


class InvalidMatch(Exception):
    pass


def validate_match(match: dict) -> dict:
    for field in REQUIRED_FIELDS:
        if not match.get(field):
            raise InvalidMatch(f"missing {field}")

    if len(match["teams"]) != 2:
        raise InvalidMatch(f"expected 2 teams, got {match['teams']}")

    if any(not team.strip() for team in match["teams"]):
        raise InvalidMatch(f"blank team name in {match['teams']}")

    if match["format"] not in VALID_FORMATS:
        raise InvalidMatch(f"unknown format {match['format']}")

    match["sourceImages"] = [url for url in match.get("sourceImages", []) if url.startswith("http")]

    return match
