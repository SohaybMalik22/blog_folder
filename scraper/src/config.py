import os

from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.environ["MONGODB_URI"]

# Set once the content-generation trigger is wired up (see README) so the
# scraper can kick off Gemini generation right after seeding new matches.
ADMIN_BASE_URL = os.environ.get("ADMIN_BASE_URL")
CRON_SECRET = os.environ.get("CRON_SECRET")

REQUEST_TIMEOUT_SECONDS = 15
DELAY_BETWEEN_REQUESTS_SECONDS = 1.5
USER_AGENT = "Mozilla/5.0 (compatible; SportsBlogBot/1.0; +for personal research project)"
