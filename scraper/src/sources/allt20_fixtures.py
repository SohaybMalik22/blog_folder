"""Scraper for https://allt20.asia/fixtures (Asian Legends League, Season 2).

robots.txt allows all bots (`Allow: /`) and the page is plain server-rendered
HTML — both verified before this was written. The fetcher re-checks robots.txt
at runtime rather than trusting that.

`sourceImages` records the image URLs found on each fixture card. These are
recorded as provenance only — they are the tournament's own copyrighted assets
and are not republished or fed into image generation. See README for how cover
images are actually sourced.
"""

import re

from bs4 import BeautifulSoup

from src import fetcher

FIXTURES_URL = "https://allt20.asia/fixtures"
VENUE = "Sharjah Media City, Sharjah, UAE"


def fetch_recent_matches() -> list[dict]:
    response = fetcher.get(FIXTURES_URL)
    soup = BeautifulSoup(response.text, "lxml")

    matches = []
    for date_section in soup.select(".fx-date-section"):
        date_label = _parse_date_label(date_section)

        for card in date_section.select(".fx-card-wrap"):
            match = _parse_card(card, date_label)
            if match is not None:
                matches.append(match)

    return matches


def _parse_date_label(date_section) -> str:
    date_block = date_section.select_one(".fx-date")
    if not date_block:
        return ""
    day_num = date_block.select_one(".num")
    month_year = date_block.select_one(".mon")
    return " ".join(
        part.get_text(strip=True) for part in (day_num, month_year) if part
    ).strip()


def _parse_card(card, date_label: str) -> dict | None:
    teams = card.select(".fx-team-name")
    if len(teams) < 2:
        return None  # ceremony/playoff placeholders with no confirmed teams yet

    match_num = card.select_one(".fx-card-num")
    status = card.select_one(".fx-status")
    time_chip = card.select_one(".fx-time-chip")

    team1 = teams[0].get_text(strip=True)
    team2 = teams[1].get_text(strip=True)
    match_label = match_num.get_text(strip=True) if match_num else "Match"
    slug = re.sub(r"[^a-z0-9]+", "-", match_label.lower()).strip("-")

    images = [
        img["src"]
        for img in card.select("img[src]")
        if img.get("src", "").startswith("http")
    ]

    return {
        "sourceUrl": f"{FIXTURES_URL}#{slug}",
        "matchTitle": f"{match_label}: {team1} vs {team2}",
        "teams": [team1, team2],
        "venue": VENUE,
        "date": date_label,
        "format": "T20",
        "scorecard": {
            "status": status.get_text(strip=True) if status else "upcoming",
            "localTime": time_chip.get_text(strip=True) if time_chip else "",
        },
        "playerPerformances": [],
        "sourceImages": images,
    }
