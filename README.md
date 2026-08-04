# Cricket Blog

AI-automated cricket blog. A Python scraper collects raw match facts, Gemini turns
them into original articles + cover images, an admin app reviews/publishes them,
and a Next.js blog serves the published posts with SSG/ISR.

## Structure

```
apps/admin   - review/edit/approve dashboard (Auth.js login), port 3001
apps/blog    - public blog, SSG + on-demand revalidation, port 3000
packages/db  - Mongoose connection + schemas (raw_matches, posts, admin_users)
packages/types - shared TypeScript types
packages/ai  - Gemini text/image generation + Cloudinary upload
scraper/     - Python scraper (runs locally, or via GitHub Actions cron in prod)
```

## First-time setup

```bash
pnpm install

# create your admin login (email/password)
cd apps/admin && pnpm seed-admin you@example.com "your-password" && cd ../..
```

Fill in the missing Cloudinary values in `apps/admin/.env.local` and
`apps/blog/.env.local` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`).

## Running locally

```bash
pnpm dev   # runs both apps via turbo (admin on :3001, blog on :3000)
```

Scraper (separate, Python):

```bash
cd scraper
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Data source

The active adapter is `scraper/src/sources/allt20_fixtures.py`, scraping
https://allt20.asia/fixtures (Asian Legends League Season 2). That site's
robots.txt allows all bots and its pages are server-rendered HTML.

Its `/results` page has no completed matches yet, so only upcoming fixtures
exist — no scorecards or player stats. When `playerPerformances` is empty the
Gemini prompt switches to preview mode so it never invents a result.

`example_source.py` is an unfilled template kept as a starting point for adding
another source. Note that ESPN Cricinfo (403s all automated requests via its
CDN) and Cricbuzz (`Disallow: /` for generic bots) were both checked and are
not scrapeable.

`src/fetcher.py` handles robots.txt compliance, throttling and retry/backoff —
the three Scrapy downloader-middleware behaviours worth having at this size.
`src/items.py` validates each scrape before it reaches MongoDB (Scrapy's item
pipeline role). If this grows to many sites or thousands of pages, move to
Scrapy proper rather than extending these: its scheduler, request fingerprinting
and concurrency handling are the hard parts to reimplement.

## Content pipeline

1. Scraper seeds `raw_matches` (status: `new`) in MongoDB.
2. It (or a manual `curl`) triggers `POST /api/generate` on the admin app with
   header `x-cron-secret: $CRON_SECRET` — this runs Gemini text + image
   generation and writes `posts`.
3. Posts scoring `>= AUTO_PUBLISH_THRESHOLD` (0.85, see `apps/admin/lib/publish.ts`)
   auto-publish; everything else lands in the admin dashboard as `pending` for
   manual review (edit / approve / reject / regenerate).
4. Approving a post notifies the blog app (`POST /api/revalidate`) so the new
   page appears without a full redeploy.

### Cover images

`createCoverImage` tries three sources in order:

1. **Pexels** — commercially licensed stock, credited on the article and linked
   in the footer as the licence asks. Needs a free `PEXELS_API_KEY`.
2. **Gemini image generation + Cloudinary** — original artwork. Gemini's free
   tier grants **no image quota** (`limit: 0` on every image model, verified
   against the live API), so this needs a paid plan plus the two missing
   Cloudinary values (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`).
3. **`/placeholder-cover.svg`** in each app's `public/`.

Images from the scraped source site are **never** used as covers. The scraper
records their URLs in `raw_matches.sourceImages` as provenance only — they are
the tournament's copyrighted photography and its logos are also trademarks, and
editing them would produce a derivative work rather than avoid the rights issue.
That is the same reason the pipeline generates prose from facts instead of
rewriting source articles.

Model names are pinned in `packages/ai/src/gemini.ts`. Google retires models
for new API keys fairly aggressively — `gemini-2.5-flash` and
`imagen-4.0-generate-001` were both already unavailable during setup. If
generation starts 404ing, list what the key can actually reach:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

## Deploying

- Two separate Vercel projects: `apps/admin` and `apps/blog` (set the Vercel
  project's root directory accordingly).
- Copy the env vars from each app's `.env.local` into that Vercel project's
  environment variables — `BLOG_BASE_URL` on the admin project must point at
  the deployed blog URL, and vice versa isn't needed but `REVALIDATE_SECRET`
  must match on both.
- GitHub Actions cron (`.github/workflows/scrape.yml`) needs repo secrets:
  `MONGODB_URI`, `ADMIN_BASE_URL` (deployed admin URL), `CRON_SECRET`.
- Repo should be public for unlimited free GitHub Actions minutes.
# blog_folder
