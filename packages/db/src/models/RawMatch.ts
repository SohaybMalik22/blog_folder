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

const RawMatchSchema = new Schema(
  {
    sourceUrl: { type: String, required: true },
    scrapedAt: { type: Date, required: true, default: Date.now },
    matchTitle: { type: String, required: true },
    teams: {
      type: [String],
      required: true,
      validate: (v: string[]) => v.length === 2,
    },
    venue: String,
    date: { type: Date, required: true },
    format: { type: String, enum: ["T20", "ODI", "Test"], required: true },
    scorecard: { type: Schema.Types.Mixed, default: {} },
    playerPerformances: { type: [PlayerPerformanceSchema], default: [] },
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
RawMatchSchema.index({ sourceUrl: 1 }, { unique: true });

export const RawMatchModel: Model<any> =
  (models.RawMatch as Model<any>) || model("RawMatch", RawMatchSchema);
