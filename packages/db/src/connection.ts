import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __cricketBlogMongoose: Promise<typeof mongoose> | undefined;
}

export function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  // Cached across hot-reloads/serverless invocations so we don't open a new
  // connection pool on every function call.
  if (!global.__cricketBlogMongoose) {
    mongoose.set("bufferCommands", false);
    global.__cricketBlogMongoose = mongoose.connect(uri);
  }

  return global.__cricketBlogMongoose;
}
