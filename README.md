# pawpayaco-starter

Minimal NFC claim flow. All tags open `https://<your-domain>/t?u=<UID>`.

- If UID already claimed → redirect to the business's affiliate link.
- If not claimed → show `/claim` page to pick a business. First click claims it.

## Environment
Add these to Vercel Project Settings → Environment Variables:
- `SUPABASE_URL` — e.g. `https://xxxxx.supabase.co`
- `SUPABASE_ANON_KEY` — **anon** key from Supabase

## Endpoints
- `GET /t?u=<UID>` — resolver; also sets a cookie `puid` for 10 minutes (iPhone-safe)
- `GET /api/businesses?search=foo` — list of unclaimed businesses
- `POST /api/claim` — body `{ business_id }` (UID is read from cookie); redirects URL is returned
- `POST /api/snowball-webhook` — optional webhook to upsert businesses

## Local testing
Open `/claim?u=TESTUID` and click a business. Or hit `/t?u=TESTUID` first to set the cookie.
