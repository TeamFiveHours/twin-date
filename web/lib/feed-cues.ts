import dialoguesJson from "@/data/dialogues.json";
import type { FeedResult } from "./feed-types";
import type { Cue, Highlight } from "./types";

/**
 * The Supabase feed only stores the video, not its transcript. The three hackathon
 * videos are re-encodes of the two mock videos whose Whisper captions and highlight
 * markers live in dialogues.json, so we borrow those by result type.
 */
const MOCK_BY_RESULT: Record<FeedResult, string> = { SPARK: "d1", MIXED: "d2", NO_SPARK: "d3" };

export function mockCuesFor(result: FeedResult): { cues: Cue[]; highlights: Highlight[]; durationSec: number } {
  const d = dialoguesJson.find((x) => x.id === MOCK_BY_RESULT[result]);
  if (!d) return { cues: [], highlights: [], durationSec: 0 };
  return {
    cues: d.cues.map((c) => ({ ...c, speaker: c.speaker as Cue["speaker"] })),
    highlights: d.highlights.map((h) => ({ ...h, tag: h.tag as Highlight["tag"] })),
    durationSec: d.video.durationSec,
  };
}
