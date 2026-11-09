export type Mood =
  | "neutral"
  | "happy"
  | "thinking"
  | "awkward"
  | "resting"
  | "talking";

export type Who = "me" | "other";

export type PersonaCards = {
  tone: string;
  humor: string;
  values: string;
  banned: string;
  ideal: string;
  examples: { tone?: string; humor?: string };
};

export type TuneEntry = { at: string; text: string };

export type Sliders = { assertive: number; humor: number; asking: number };

export type Twin = {
  name: string;
  version: number;
  cards: PersonaCards;
  sliders: Sliders;
  banned: string[];
  accuracy: number;
  paused: boolean;
  history: TuneEntry[];
  connections: string[]; // connected source ids (1-2 / 5-1)
};

export type User = {
  email: string;
  name: string;
  birthYear: number;
  gender: "f" | "m" | "x";
  seeking: "f" | "m" | "all";
  goal: "casual" | "serious";
  provider?: "google" | "apple";
};

export type Turn = { role: "interviewer" | "me"; text: string; at: number };

export type Interview = {
  transcript: Turn[];
  topicIndex: number;
  startedAt: number;
};

export type OtherTwin = { id: string; alias: string; who: "other" };

export type Tag = "good" | "bad" | "odd";
export type Result = "good" | "meh" | "bad";

export type Cue = {
  id: string;
  speaker: Who;
  text: string;
  start: number;
  end: number;
};

export type Highlight = { cueId: string; tag: Tag; label: string };

export type Dialogue = {
  id: string;
  otherId: string;
  at: string; // ISO
  result: Result;
  verdict: string; // Twin's one-line take, first person
  video: {
    url: string;
    durationSec: number;
    poster?: string;
    /** CSS aspect-ratio of the file, e.g. "1080 / 1920" */
    aspect?: string;
    /** the file already carries name labels and captions, so the stage draws none of its own */
    native?: boolean;
    /** object-position for the feed thumbnail crop */
    thumbFocus?: string;
  };
  cues: Cue[];
  highlights: Highlight[];
  durationSec: number;
  lineCount: number;
};

export type Candidate = {
  id: string;
  dialogueId: string;
  name: string;
  age: number;
  school: string;
  photos: string[];
  bio: string;
  whyLine: string;
  quotes: string[];
  expiresAt: string;
  theirDecision: "yes" | "no" | "pending";
};

export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  at: string;
};

export type Chat = {
  id: string;
  candidateId: string;
  /** set for chats opened from a Supabase feed item (no candidates.json entry) */
  dialogueId?: string;
  person?: { name: string; age: number; photo: string; twinAlias: string };
  messages: Message[];
  pinned: string[];
  pinnedKeywords: string;
  opener: string[];
  openerUsed?: boolean;
  matchedAt: string;
};

export type Proposal = { place: string; when: string; why: string };

export type Meeting = {
  id: string;
  chatId: string;
  proposals: Proposal[];
  chosen?: number;
  status: "proposed" | "accepted" | "confirmed" | "cancelled";
  at?: string;
};

export type Outcome = {
  met: "yes" | "no" | "cancelled";
  again?: "yes" | "no" | "unsure";
  twinRight: "up" | "down";
  note?: string;
};

export type TwinState = "talking" | "back" | "resting";

export type HomeData = {
  twinState: TwinState;
  talkingIndex: number;
  todayCount: number;
  stats: { chats: number; clicked: number; missed: number };
  recent: Dialogue[];
  matchedCount: number;
  pendingSurvey: { meetingId: string; name: string } | null;
};

export type Suggested = {
  id: string;
  alias: string;
  age: number;
  bio: string;
  distanceMi: number;
  twinActive: boolean;
};

export type SourceKind =
  | "instagram"
  | "spotify"
  | "calendar"
  | "netflix"
  | "maps"
  | "youtube";

export type ScreenState = "empty" | "loading" | "error" | null;

export type InstagramSummary = {
  username: string | null;
  collectedAt: string;
  counts: {
    feed: number;
    reels: number;
    explore: number;
    followers: number;
    following: number;
    followerTotal: number | null;
    followingTotal: number | null;
  };
};
