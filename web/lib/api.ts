"use client";

/**
 * All data access goes through this module. Today it reads data/*.json and
 * mutates the Zustand store after a small delay; later each function becomes
 * a fetch() to the real API without touching the screens.
 */

import { useStore } from "./store";
import { jitter, delay, minutesAgo, uid } from "./utils";
import type { FeedItem } from "./feed-types";
import { baseAccuracy, EMPTY_CARDS, SOURCE_STEP } from "./persona";
import type {
  Chat,
  Dialogue,
  Meeting,
  Outcome,
  PersonaCards,
  Proposal,
  Result,
  Sliders,
  Suggested,
  Turn,
  Twin,
  User,
} from "./types";

import meJson from "@/data/me.json";
import interviewJson from "@/data/interview.json";
import dialoguesJson from "@/data/dialogues.json";
import chatsJson from "@/data/chats.json";
import meetingsJson from "@/data/meetings.json";
import repliesJson from "@/data/replies.json";
import alternativesJson from "@/data/alternatives.json";
import suggestedJson from "@/data/suggested.json";

const store = () => useStore.getState();

/* ------------------------------------------------------------------ */
/* Auth / onboarding                                                   */
/* ------------------------------------------------------------------ */

export async function signIn(provider: "google" | "apple"): Promise<User> {
  await delay(500);
  const user: User = {
    email: provider === "google" ? "you@gmail.com" : "you@icloud.com",
    name: "You",
    birthYear: 2000,
    gender: "x",
    seeking: "all",
    goal: "serious",
    provider,
  };
  store().set({ user });
  return user;
}

export type Source = (typeof meJson.sources)[number];

export function listSources(): Source[] {
  return meJson.sources;
}

export async function connectSource(kind: string) {
  await delay(800);
  const t = store().twin;
  if (!t.connections.includes(kind)) {
    store().setTwin({
      connections: [...t.connections, kind],
      accuracy: Math.min(100, t.accuracy + SOURCE_STEP),
    });
  }
  return { ok: true, accuracyDelta: SOURCE_STEP };
}

export async function disconnectSource(kind: string) {
  await delay(300);
  const t = store().twin;
  store().setTwin({
    connections: t.connections.filter((c) => c !== kind),
    accuracy: Math.max(0, t.accuracy - SOURCE_STEP),
  });
  return { ok: true };
}

export type InterviewStep = {
  question: string;
  /** example answer shown under the question so nobody freezes up */
  hint: string | null;
  topicIndex: number;
  topicTitle: string;
  topicCount: number;
  questionIndex: number; // 0 or 1 within topic
  done: boolean;
};

/** Returns the next interviewer question given the transcript so far. */
export async function interviewNext(
  transcript: Turn[],
  mode: "full" | "extra" = "full",
): Promise<InterviewStep> {
  await jitter(300, 600);
  const topics = mode === "extra" ? interviewJson.extra : interviewJson.topics;
  // skipped questions are stored as empty "me" turns, so they still advance
  const answered = transcript.filter((t) => t.role === "me").length;
  const total = topics.length * 2;
  if (answered >= total) {
    const last = topics.length - 1;
    return {
      question: "",
      hint: null,
      topicIndex: last,
      topicTitle: topics[last].title,
      topicCount: topics.length,
      questionIndex: 1,
      done: true,
    };
  }
  const topicIndex = Math.floor(answered / 2);
  const questionIndex = answered % 2;
  const q = topics[topicIndex].questions[questionIndex];
  return {
    question: q.q,
    hint: q.hint,
    topicIndex,
    topicTitle: topics[topicIndex].title,
    topicCount: topics.length,
    questionIndex,
    done: false,
  };
}

/** Builds the persona cards. Fewer than 3 answers → two cards left empty. */
export async function buildPersona(transcript: Turn[]): Promise<PersonaCards> {
  await delay(1000);
  const answered = transcript.filter((t) => t.role === "me" && t.text.trim()).length;
  const cards: PersonaCards = { ...meJson.cards, examples: { ...meJson.cards.examples } };
  if (answered < 3) {
    cards.values = "";
    cards.ideal = "";
  }
  const t = store().twin;
  store().setTwin({
    cards,
    accuracy: Math.max(t.accuracy, Math.round(baseAccuracy(cards, t.connections))),
  });
  return cards;
}

export async function requestRecorder(address: NonNullable<ReturnType<typeof store>["address"]>) {
  await delay(700);
  store().set({ address });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Dialogues (what my Twin did)                                        */
/* ------------------------------------------------------------------ */

type RawDialogue = (typeof dialoguesJson)[number];

function hydrateDialogue(d: RawDialogue): Dialogue {
  return {
    id: d.id,
    otherId: d.otherId,
    at: minutesAgo(d.agoMin),
    result: d.result as Result,
    verdict: d.verdict,
    video: d.video,
    cues: d.cues.map((c) => ({ ...c, speaker: c.speaker as "me" | "other" })),
    highlights: d.highlights.map((h) => ({ ...h, tag: h.tag as "good" | "bad" | "odd" })),
    durationSec: d.durationSec,
    lineCount: d.lineCount,
  };
}

export async function getDialogue(id: string): Promise<Dialogue | null> {
  await jitter(300, 600);
  return dialoguesJson.map(hydrateDialogue).find((d) => d.id === id) ?? null;
}

export async function alternatives(dialogueId: string, lineId: string): Promise<string[]> {
  await jitter(300, 600);
  const key = `${dialogueId}:${lineId}` as keyof typeof alternativesJson;
  return (alternativesJson[key] ?? alternativesJson.default) as string[];
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

export async function getSuggested(): Promise<Suggested[]> {
  await jitter(300, 600);
  return suggestedJson;
}

/* ------------------------------------------------------------------ */
/* Tune                                                                */
/* ------------------------------------------------------------------ */

export async function saveTune(partial: {
  sliders?: Sliders;
  banned?: string[];
  cards?: Partial<PersonaCards>;
  note: string;
}): Promise<Twin> {
  await delay(500);
  const t = store().twin;
  const d = new Date();
  const entry = { at: `${d.getMonth() + 1}/${d.getDate()}`, text: partial.note };
  store().setTwin({
    sliders: partial.sliders ?? t.sliders,
    banned: partial.banned ?? t.banned,
    cards: partial.cards ? { ...t.cards, ...partial.cards } : t.cards,
    version: t.version + 1,
    history: [entry, ...t.history].slice(0, 20),
  });
  return store().twin;
}

/* ------------------------------------------------------------------ */
/* Chats                                                               */
/* ------------------------------------------------------------------ */

export type ChatPerson = { name: string; age: number; photo: string; twinAlias: string };

/**
 * Match from a Supabase feed item. SPARK partners already said yes, so the chat
 * opens right away; MIXED / NO_SPARK stay "Match sent" (no partner simulation yet).
 */
export async function matchFeed(feed: FeedItem): Promise<{ matched: boolean; chatId?: string }> {
  await delay(600);
  store().set((s) => ({ decisions: { ...s.decisions, [feed.id]: "yes" } }));
  if (feed.result !== "SPARK") return { matched: false };
  const existing = chatForCandidate(feed.id);
  if (existing) return { matched: true, chatId: existing.id };
  const chatId = `chat_${feed.id}`;
  const p = feed.profiles;
  const chat: Chat = {
    id: chatId,
    candidateId: feed.id,
    dialogueId: feed.id,
    person: { name: p.name, age: p.age ?? 0, photo: p.photo_url ?? "", twinAlias: feed.twin_name },
    messages: [],
    pinned: [],
    pinnedKeywords: feed.momo_one_liner,
    opener: [`So, what did ${feed.twin_name} tell you about me?`, "Any plans this weekend?"],
    openerUsed: false,
    matchedAt: new Date().toISOString(),
  };
  store().set((s) => ({ chats: { ...s.chats, [chatId]: chat } }));
  return { matched: true, chatId };
}

function feedChatFor(candidateId: string): Chat | undefined {
  return Object.values(store().chats).find((c) => c.candidateId === candidateId && c.person);
}

export type ChatSummary = {
  chat: Chat;
  person: ChatPerson;
  lastMessage: string;
  lastAt: string;
  unread: boolean;
  meeting?: Meeting;
};

function existingChats(): Chat[] {
  return chatsJson.existing.map((c) => ({
    id: c.id,
    candidateId: c.candidateId,
    dialogueId: c.dialogueId,
    messages: c.messages.map((m) => ({
      id: m.id,
      from: m.from as "me" | "them",
      text: m.text,
      at: minutesAgo(m.agoMin),
    })),
    pinned: c.pinned,
    pinnedKeywords: c.pinnedKeywords,
    opener: c.opener,
    openerUsed: c.openerUsed,
    matchedAt: minutesAgo(c.matchedAgoMin),
  }));
}

export function personOf(candidateId: string): ChatPerson {
  const e = chatsJson.existing.find((x) => x.candidateId === candidateId);
  if (e) return { name: e.name, age: e.age, photo: e.photo, twinAlias: e.twinAlias ?? "" };
  const f = feedChatFor(candidateId);
  if (f?.person) return f.person;
  return { name: "Someone", age: 0, photo: "", twinAlias: "" };
}

function findChat(id: string): Chat | null {
  const s = store();
  // store copy (user-created or user-modified) wins over the json seed
  if (s.chats[id]) return s.chats[id];
  return existingChats().find((c) => c.id === id) ?? null;
}

function putChat(chat: Chat) {
  store().set((s) => ({ chats: { ...s.chats, [chat.id]: chat } }));
}

function meetingFor(chatId: string): Meeting | undefined {
  return Object.values(store().meetings).find((m) => m.chatId === chatId);
}

export async function listChats(): Promise<ChatSummary[]> {
  await jitter(300, 600);
  const s = store();
  const seeds = existingChats().filter((c) => !s.chats[c.id]);
  const all = [...Object.values(s.chats), ...seeds];
  return all
    .map((chat) => {
      const last = chat.messages[chat.messages.length - 1];
      return {
        chat,
        person: personOf(chat.candidateId),
        lastMessage: last?.text ?? "You both said yes. Say hi!",
        lastAt: last?.at ?? chat.matchedAt,
        unread: last?.from === "them",
        meeting: meetingFor(chat.id),
      };
    })
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

export async function getChat(id: string): Promise<{ chat: Chat; person: ChatPerson; meeting?: Meeting } | null> {
  await jitter(300, 600);
  const chat = findChat(id);
  if (!chat) return null;
  return { chat, person: personOf(chat.candidateId), meeting: meetingFor(id) };
}

export async function sendMessage(id: string, text: string): Promise<Chat> {
  const chat = findChat(id);
  if (!chat) throw new Error("no chat");
  const next: Chat = {
    ...chat,
    openerUsed: true,
    messages: [
      ...chat.messages,
      { id: uid("m"), from: "me", text, at: new Date().toISOString() },
    ],
  };
  putChat(next);
  return next;
}

/** Resolves ~1.5s later with the other person's reply appended. */
export async function awaitReply(id: string): Promise<Chat> {
  await delay(1500);
  const chat = findChat(id);
  if (!chat) throw new Error("no chat");
  const mine = chat.messages.filter((m) => m.from === "me").length;
  const reply = repliesJson[(mine - 1 + repliesJson.length) % repliesJson.length];
  const next: Chat = {
    ...chat,
    messages: [
      ...chat.messages,
      { id: uid("m"), from: "them", text: reply, at: new Date().toISOString() },
    ],
  };
  putChat(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Meetings                                                            */
/* ------------------------------------------------------------------ */

export async function getProposals(chatId: string): Promise<Meeting> {
  await jitter(300, 600);
  const existing = meetingFor(chatId);
  if (existing) return existing;
  const m: Meeting = {
    id: `mt_${chatId}`,
    chatId,
    proposals: meetingsJson.proposals,
    status: "proposed",
  };
  store().set((s) => ({ meetings: { ...s.meetings, [m.id]: m } }));
  return m;
}

/** Sends a proposal; resolves after the "they accepted" beat (~2s). */
export async function proposeMeeting(
  chatId: string,
  choice: number | Proposal,
): Promise<Meeting> {
  const m = await getProposals(chatId);
  let proposals = m.proposals;
  let chosen: number;
  if (typeof choice === "number") {
    chosen = choice;
  } else {
    proposals = [...m.proposals, choice];
    chosen = proposals.length - 1;
  }
  await delay(2000);
  const confirmed: Meeting = {
    ...m,
    proposals,
    chosen,
    status: "confirmed",
    at: new Date().toISOString(),
  };
  store().set((s) => ({ meetings: { ...s.meetings, [m.id]: confirmed } }));
  return confirmed;
}

export async function getPendingSurvey(): Promise<{ meetingId: string; name: string } | null> {
  const s = store();
  const m = Object.values(s.meetings).find(
    (x) => x.status === "confirmed" && !s.outcomes[x.id],
  );
  if (!m) return null;
  const chat = findChat(m.chatId);
  return { meetingId: m.id, name: chat ? personOf(chat.candidateId).name : "them" };
}

export async function getMeeting(meetingId: string): Promise<{ meeting: Meeting; person: ChatPerson } | null> {
  await jitter(200, 400);
  const m = store().meetings[meetingId];
  if (!m) return null;
  const chat = findChat(m.chatId);
  return { meeting: m, person: chat ? personOf(chat.candidateId) : { name: "them", age: 0, photo: "", twinAlias: "" } };
}

export async function submitOutcome(meetingId: string, o: Outcome) {
  await delay(500);
  store().set((s) => ({ outcomes: { ...s.outcomes, [meetingId]: o } }));
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Me                                                                  */
/* ------------------------------------------------------------------ */

export async function getMe() {
  await jitter(300, 600);
  const s = store();
  return { twin: s.twin, user: s.user, accuracy: s.twin.accuracy, blocked: s.blocked };
}

export async function pauseTwin(paused: boolean) {
  await delay(400);
  store().setTwin({ paused });
  return { ok: true };
}

export async function clearLogs() {
  await delay(400);
  store().set({ logsCleared: true });
  return { ok: true };
}

export async function deleteAccount() {
  await delay(600);
  store().reset();
  return { ok: true };
}

export async function addAccuracy(delta: number) {
  const t = store().twin;
  store().setTwin({ accuracy: Math.min(100, t.accuracy + delta) });
  return { ok: true };
}

export { EMPTY_CARDS };

/** The Twin-to-Twin dialogue that led to this candidate, else null (seeded chats have none). */
export function dialogueForCandidate(candidateId: string): string | null {
  return (
    feedChatFor(candidateId)?.dialogueId ??
    existingChats().find((c) => c.candidateId === candidateId)?.dialogueId ??
    null
  );
}

/** The chat opened with a candidate after a mutual Yes, if any. */
export function chatForCandidate(candidateId: string): Chat | null {
  const s = store();
  return (
    Object.values(s.chats).find((c) => c.candidateId === candidateId) ??
    existingChats().find((c) => c.candidateId === candidateId) ??
    null
  );
}
