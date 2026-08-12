import { Schema, model, models, type Model } from "mongoose";

/**
 * Raw events expire after this many days. Analytics on a free Atlas tier is the
 * one collection that grows without bound — at ~200 bytes a document, a million
 * views is 200 MB of a 512 MB quota. Long-term trend would need daily rollups;
 * until then this window is what the admin can report on.
 */
export const PAGE_VIEW_RETENTION_DAYS = 180;

const PageViewSchema = new Schema(
  {
    // Normalised pathname only — never the query string, which can carry
    // whatever a referrer decided to append.
    path: { type: String, required: true },
    /** Post slug when the view was an article, so top-posts needs no path parsing. */
    postSlug: { type: String, default: null },
    sport: { type: String, enum: ["cricket", "motorsport"], default: null },
    /** Referrer *host* only, not the full URL: enough to rank sources, and it
     *  avoids storing the path someone came from. Null for direct visits. */
    referrerHost: { type: String, default: null },
    /**
     * Salted daily hash of IP + user agent. Lets us count unique visitors
     * without storing an identifier: the salt rotates every day, so the hashes
     * cannot be linked across days or back to a person, and nothing here is a
     * cookie. This is why the blog needs no consent banner.
     */
    visitorHash: { type: String, required: true },
    device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    country: { type: String, default: null },
    ts: { type: Date, required: true, default: Date.now },
  },
  // Explicit collection name: Mongoose would pluralize to "pageviews", and every
  // shared collection in this repo pins its name on both sides.
  { collection: "page_views" }
);

// Every admin query is "recent events, grouped by X", so ts leads each index.
PageViewSchema.index({ ts: -1 });
PageViewSchema.index({ ts: -1, postSlug: 1 });
PageViewSchema.index({ ts: -1, sport: 1 });
PageViewSchema.index({ ts: -1, referrerHost: 1 });
// TTL: Mongo drops expired documents on its own background sweep.
PageViewSchema.index({ ts: 1 }, { expireAfterSeconds: PAGE_VIEW_RETENTION_DAYS * 86400 });

export const PageViewModel: Model<any> =
  (models.PageView as Model<any>) || model("PageView", PageViewSchema);
