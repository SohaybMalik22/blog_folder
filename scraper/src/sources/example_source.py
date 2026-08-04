"""Template scraper adapter.

This is NOT wired to a real cricket site yet — the actual source (ESPN
Cricinfo, Cricbuzz, an official board API, etc.) hasn't been picked. Fill in
`LISTING_URL` and the CSS selectors below once it is, following this same
shape: fetch_recent_matches() must return a list of dicts matching the
RawMatch schema (packages/db/src/models/RawMatch.ts) so the rest of the
pipeline (db.save_raw_match, the admin /api/generate route) doesn't need to
change.

Before pointing this at a real site: check its robots.txt, and prefer a
public/JSON API over HTML scraping if the site exposes one (see
scrapping_roadmap notes — Network tab / XHR often reveals one).
"""

import time

import requests
from bs4 import BeautifulSoup

from src.config import DELAY_BETWEEN_REQUESTS_SECONDS, REQUEST_TIMEOUT_SECONDS, USER_AGENT

LISTING_URL = "https://example.com/cricket/recent-matches"  # TODO: replace


def fetch_recent_matches() -> list[dict]:
    headers = {"User-Agent": USER_AGENT}
    response = requests.get(LISTING_URL, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")

    match_links = soup.select(".match-card a")  # TODO: real selector

    matches = []
    for link in match_links:
        url = link.get("href")
        if not url:
            continue
        time.sleep(DELAY_BETWEEN_REQUESTS_SECONDS)
        matches.append(_scrape_match_detail(url, headers))

    return [m for m in matches if m is not None]


def _scrape_match_detail(url: str, headers: dict) -> dict | None:
    response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, "lxml")

    # TODO: replace every selector below with the real site's markup.
    match_title = soup.select_one(".match-title")
    team_names = soup.select(".team-name")
    venue = soup.select_one(".venue")
    date_text = soup.select_one(".match-date")
    format_text = soup.select_one(".match-format")

    if not match_title or len(team_names) < 2:
        return None

    return {
        "sourceUrl": url,
        "scrapedAt": None,  # set by caller / db layer
        "matchTitle": match_title.get_text(strip=True),
        "teams": [team_names[0].get_text(strip=True), team_names[1].get_text(strip=True)],
        "venue": venue.get_text(strip=True) if venue else "",
        "date": date_text.get_text(strip=True) if date_text else "",
        "format": _normalize_format(format_text.get_text(strip=True) if format_text else ""),
        "scorecard": _scrape_scorecard(soup),
        "playerPerformances": _scrape_player_performances(soup),
    }


def _normalize_format(raw: str) -> str:
    raw = raw.upper()
    if "T20" in raw:
        return "T20"
    if "TEST" in raw:
        return "Test"
    return "ODI"


def _scrape_scorecard(soup: BeautifulSoup) -> dict:
    # TODO: parse innings/overs/score tables into a structured dict.
    return {}


def _scrape_player_performances(soup: BeautifulSoup) -> list[dict]:
    # TODO: parse batting/bowling tables into
    # [{"name": ..., "runs": ..., "wickets": ..., ...}, ...]
    return []
