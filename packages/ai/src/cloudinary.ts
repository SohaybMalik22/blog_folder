import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary env vars missing (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)"
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export async function uploadCoverImage(imageBuffer: Buffer, publicId: string): Promise<string> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cricket-blog/covers",
        public_id: publicId,
        overwrite: true,
        format: "webp",
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(imageBuffer);
  });
}
