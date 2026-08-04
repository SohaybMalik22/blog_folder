import { Schema, model, models, type Model } from "mongoose";

const PostSchema = new Schema(
  {
    matchRef: { type: Schema.Types.ObjectId, ref: "RawMatch", required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    metaDescription: { type: String, required: true },
    tags: { type: [String], default: [] },
    bodyMarkdown: { type: String, required: true },
    imageUrl: { type: String, required: true },
    imageAlt: { type: String, required: true },
    // Set when the cover came from a stock library whose licence asks for
    // photographer credit (Pexels).
    imageCredit: { type: String, default: null },
    imageCreditUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
    },
    confidenceScore: { type: Number, required: true, min: 0, max: 1 },
    generatedAt: { type: Date, required: true, default: Date.now },
    publishedAt: { type: Date, default: null },
    editedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "posts" }
);

PostSchema.index({ status: 1, publishedAt: -1 });

export const PostModel: Model<any> =
  (models.Post as Model<any>) || model("Post", PostSchema);
