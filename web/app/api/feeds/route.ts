import { listFeedItems } from "@/lib/feed-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feeds = await listFeedItems();
    return Response.json(feeds, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/feeds", error);
    return Response.json({ error: "Could not load feeds" }, { status: 500 });
  }
}
