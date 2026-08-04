from datetime import datetime, timezone

from pymongo import MongoClient

from src.config import MONGODB_URI

_client = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client.get_default_database()


def save_raw_match(match: dict) -> str:
    """Upsert by sourceUrl so re-running the scraper never creates duplicates.

    `match` must match the shape of the Mongoose RawMatch schema in
    packages/db/src/models/RawMatch.ts.
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    result = db.raw_matches.update_one(
        {"sourceUrl": match["sourceUrl"]},
        {
            "$setOnInsert": {
                "status": "new",
                "createdAt": now,
            },
            "$set": {
                **match,
                "updatedAt": now,
            },
        },
        upsert=True,
    )

    if result.upserted_id is not None:
        return str(result.upserted_id)

    existing = db.raw_matches.find_one({"sourceUrl": match["sourceUrl"]}, {"_id": 1})
    return str(existing["_id"])
