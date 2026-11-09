# TwinDate: Supabase read-only Feed integration

This patch replaces mock JSON **only in Feed (`/watch`), video detail (`/watch/:id`), and the new profile page (`/profile/:id`)**. Existing onboarding, chats and other mock pages remain unchanged.

## 1. Environment

Create `web/.env.local` from `web/.env.example`. In Supabase → Settings → API Keys (or Connect), copy the **publishable** key, not the secret key or service-role key. No new npm packages are required.

```
SUPABASE_URL=https://wludvazctcooytzjjjxi.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

In Vercel: Project → Settings → Environment Variables, add **the same two variables**, set Production (and Preview if needed), then **Redeploy**. Root Directory stays `web`.

## 2. Run

```
cd web
npm ci
npm run dev
```

Go to `/watch` after completing onboarding. The existing `(tabs)/layout.tsx` redirects users who have not onboarded to `/onboarding/signup`; this patch deliberately keeps that behavior.

## 3. Verify

- `/api/feeds` returns 3 items ordered by `display_order`
- `/api/feeds/spark-chandler`, `/api/feeds/mixed-orbit`, `/api/feeds/no-spark-riff` return one item, including its `profiles` object and `partner_messages` array
- `/watch` lists 3 result types; `/watch/:id` streams video URL from Storage and displays Momo's take
- `Like & see photos` opens `/profile/:id`; profile shows photo, name, age, affiliation, Momo's one-liner/take, partner lines
- Like and Pass remain **browser-local** in the existing Zustand persisted `decisions` state, keyed by feed ID

## 4. Notes

- Because your current SQL grants SELECT to `anon` / `authenticated` and uses public RLS policies, the demo data is accessible to anyone with the publishable key. Do not store real private profile information under this policy.
- The `SPARK` profile currently has only one saved line in `partner_messages`. Add the other *verified* Chandler lines later if you want the full dialogue displayed.
- `StagePlayer` embeds the supplied video as-is. Since the videos already have captions, the player does not add artificial captions or highlights.
- Direct browser calls to the Supabase REST endpoint are not necessary; Next.js server Route Handlers proxy it through `/api/feeds`.
