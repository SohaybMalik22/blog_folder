import { generateCoverImage } from "./gemini";
import { uploadCoverImage } from "./cloudinary";
import { buildPhotoQueries, findStockPhoto } from "./pexels";

// Served from each app's /public.
export const FALLBACK_COVER_URL = "/placeholder-cover.svg";

export interface CoverImage {
  imageUrl: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
}

/**
 * Cover images are sourced in this order:
 *
 *  1. Pexels — commercially licensed stock, credited. The normal path.
 *  2. Gemini image generation + Cloudinary — original artwork, but Gemini's
 *     free tier grants no image quota, so this only works on a paid plan.
 *  3. The bundled SVG plate.
 *
 * Images from the scraped source site are deliberately never used: they are the
 * tournament's copyrighted assets (and its logos are trademarks), and editing
 * them would produce a derivative work rather than avoid the rights issue.
 */
export async function createCoverImage(
  imagePrompt: string,
  slug: string,
  options: { format?: string; tags?: string[] } = {}
): Promise<CoverImage> {
  try {
    const photo = await findStockPhoto(
      buildPhotoQueries(options.format ?? "T20", options.tags ?? [], slug),
      slug
    );
    if (photo) {
      return {
        imageUrl: photo.url,
        imageAlt: photo.alt,
        imageCredit: photo.credit,
        imageCreditUrl: photo.creditUrl,
      };
    }
  } catch (err) {
    console.warn(`Pexels lookup failed: ${(err as Error).message}`);
  }

  try {
    const imageBuffer = await generateCoverImage(imagePrompt);
    return { imageUrl: await uploadCoverImage(imageBuffer, slug) };
  } catch (err) {
    console.warn(`Generated cover unavailable, using fallback: ${(err as Error).message}`);
    return { imageUrl: FALLBACK_COVER_URL };
  }
}
