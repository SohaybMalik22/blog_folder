from datetime import datetime, timezone

from src.db import save_raw_match
from src.fetcher import ScrapeBlocked
from src.items import InvalidMatch, validate_match
from src.sources import allt20_fixtures
from src.trigger import trigger_content_generation

SOURCES = [allt20_fixtures]  # add more scraper adapters here as they're built


def run() -> None:
    saved = 0
    skipped = 0

    for source in SOURCES:
        print(f"Scraping via {source.__name__}...")
        try:
            matches = source.fetch_recent_matches()
        except ScrapeBlocked as err:
            print(f"  SKIPPED — {err}")
            continue

        for match in matches:
            try:
                validate_match(match)
            except InvalidMatch as err:
                print(f"  skipped {match.get('matchTitle', '?')}: {err}")
                skipped += 1
                continue

            match["scrapedAt"] = datetime.now(timezone.utc)
            match_id = save_raw_match(match)
            images = len(match.get("sourceImages", []))
            print(f"  saved {match['matchTitle']} -> {match_id} ({images} image urls)")
            saved += 1

    print(f"Done. {saved} saved, {skipped} skipped.")

    if saved > 0:
        trigger_content_generation()


if __name__ == "__main__":
    run()
