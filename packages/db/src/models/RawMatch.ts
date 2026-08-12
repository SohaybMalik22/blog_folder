import { Schema, model, models, type Model } from "mongoose";

const PlayerPerformanceSchema = new Schema(
  {
    name: { type: String, required: true },
    runs: Number,
    balls: Number,
    wickets: Number,
    overs: Number,
    strikeRate: Number,
    economy: Number,
  },
  { _id: false }
);

const EventStandingSchema = new Schema(
  {
    position: { type: Number, required: true },
    name: { type: String, required: true },
    team: String,
    detail: String,
    points: Number,
  },
  { _id: false }
);

const RawMatchSchema = new Schema(
  {
    // Absent on documents written before the pipeline covered more than
    // cricket, so the default backfills them on read.
    sport: {
      type: String,
      enum: ["cricket", "motorsport"],
      required: true,
      default: "cricket",
    },
    sourceUrl: { type: String, required: true },
    scrapedAt: { type: Date, required: true, default: Date.now },
    matchTitle: { type: String, required: true },
    competition: String,
    // Two teams for head-to-head sports, empty for field events like a race
    // where `standings` carries the grid instead.
    teams: {
      type: [String],
      default: [],
      validate: (v: string[]) => v.length === 0 || v.length === 2,
    },
    venue: String,
    // The Python scraper writes a display string ("30 JUL 2026", "2026-07-26")
    // rather than a BSON date, and pymongo bypasses this schema on write, so
    // typing it as Date here would only misrepresent what is stored.
    date: { type: Schema.Types.Mixed, required: true },
    format: { type: String, required: true },
    scorecard: { type: Schema.Types.Mixed, default: {} },
    playerPerformances: { type: [PlayerPerformanceSchema], default: [] },
    standings: { type: [EventStandingSchema], default: [] },
    // Image URLs seen on the source page, kept as provenance only. These are
    // the source site's copyrighted assets and are never republished.
    sourceImages: { type: [String], default: [] },
    status: { type: String, enum: ["new", "processed"], default: "new" },
  },
  // Explicit collection name: Mongoose would otherwise pluralize to
  // "rawmatches", but the Python scraper writes to "raw_matches".
  { timestamps: true, collection: "raw_matches" }
);

RawMatchSchema.index({ status: 1 });
RawMatchSchema.index({ sport: 1 });
RawMatchSchema.index({ sourceUrl: 1 }, { unique: true });

export const RawMatchModel: Model<any> =
  (models.RawMatch as Model<any>) || model("RawMatch", RawMatchSchema);
