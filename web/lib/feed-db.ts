/** Server-only data access through Supabase's public REST API. Do not import in client components. */
import type { FeedDetail, FeedItem } from "./feed-types";

const FEED_COLUMNS = [
  "id", "profile_id", "twin_name", "result", "video_url", "momo_take",
  "momo_one_liner", "turn_count", "display_order",
  "profiles(id,name,age,affiliation,photo_url)",
].join(",");

async function readSupabase<T>(table: string, params: URLSearchParams): Promise<T> {
  const url = process.env.SUPABASE_URL;
  // Both modern publishable keys and legacy anon keys work with public RLS reads.
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in environment");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?${params.toString()}`, {
    headers: { apikey: key, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${table} request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export function listFeedItems(): Promise<FeedItem[]> {
  return readSupabase<FeedItem[]>(
    "feed_items",
    new URLSearchParams({ select: FEED_COLUMNS, order: "display_order.asc" }),
  );
}

export async function readFeedDetail(id: string): Promise<FeedDetail | null> {
  const rows = await readSupabase<FeedDetail[]>(
    "feed_items",
    new URLSearchParams({
      select: `${FEED_COLUMNS},partner_messages(seq,content)`,
      id: `eq.${id}`,
      limit: "1",
    }),
  );
  const feed = rows[0];
  if (!feed) return null;
  return {
    ...feed,
    partner_messages: [...(feed.partner_messages ?? [])].sort((a, b) => a.seq - b.seq),
  };
}
