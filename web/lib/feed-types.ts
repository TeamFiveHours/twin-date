/** Data returned from the three public hackathon tables in Supabase. */
export type FeedResult = "SPARK" | "MIXED" | "NO_SPARK";

export type FeedProfile = {
  id: string;
  name: string;
  age: number | null;
  affiliation: string | null;
  photo_url: string | null;
};

export type FeedItem = {
  id: string;
  profile_id: string;
  twin_name: string;
  result: FeedResult;
  video_url: string | null;
  momo_take: string;
  momo_one_liner: string;
  turn_count: number;
  display_order: number;
  profiles: FeedProfile;
};

export type PartnerMessage = {
  seq: number;
  content: string;
};

export type FeedDetail = FeedItem & {
  partner_messages: PartnerMessage[];
};

export const FEED_RESULT_META: Record<FeedResult, { label: string; tone: "good" | "warn" | "bad"; rank: number }> = {
  SPARK: { label: "Spark", tone: "good", rank: 0 },
  MIXED: { label: "Mixed", tone: "warn", rank: 1 },
  NO_SPARK: { label: "No spark", tone: "bad", rank: 2 },
};
