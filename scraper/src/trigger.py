import requests

from src.config import ADMIN_BASE_URL, CRON_SECRET


def trigger_content_generation() -> None:
    """Ask the admin app to run Gemini generation on newly-scraped matches.

    No-op if ADMIN_BASE_URL/CRON_SECRET aren't set (e.g. local runs where you
    trigger generation manually from the admin UI instead).
    """
    if not ADMIN_BASE_URL or not CRON_SECRET:
        print("ADMIN_BASE_URL / CRON_SECRET not set — skipping generation trigger")
        return

    # The scrape has already been persisted by this point, so a failing trigger
    # must not fail the run — the matches stay `new` and the next run (or a
    # manual call) picks them up.
    try:
        response = requests.post(
            f"{ADMIN_BASE_URL}/api/generate",
            headers={"x-cron-secret": CRON_SECRET},
            timeout=600,
        )
        response.raise_for_status()
        print("Triggered content generation:", response.json())
    except requests.RequestException as err:
        print(f"Content generation trigger failed ({err}) — matches remain 'new'")
