import { readFeedDetail } from "@/lib/feed-db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log("[DEBUG feed detail] id =", JSON.stringify(id)); // Next.js 15 dynamic route params are async
  try {
    const feed = await readFeedDetail(id);
    if (!feed) return Response.json({ error: "Feed not found" }, { status: 404 });
    return Response.json(feed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`GET /api/feeds/${id}`, error);
    return Response.json({ error: "Could not load feed detail" }, { status: 500 });
  }
}
