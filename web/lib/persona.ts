import type { PersonaCards, Sliders, Twin } from "./types";

export const DEFAULT_SLIDERS: Sliders = { assertive: 0.55, humor: 0.5, asking: 0.6 };

export const EMPTY_CARDS: PersonaCards = {
  tone: "",
  humor: "",
  values: "",
  banned: "",
  ideal: "",
  examples: {},
};

export const CARD_LABELS: Record<keyof Omit<PersonaCards, "examples">, string> = {
  tone: "How I talk",
  humor: "My humor",
  values: "What matters to me",
  banned: "What I won't bring up",
  ideal: "Who I'm looking for",
};

export const CARD_OPTIONS: Record<keyof Omit<PersonaCards, "examples">, string[]> = {
  tone: ["Calmer", "More polite", "Shorter", "Emojis are fine"],
  humor: ["Drier", "Sillier", "Less teasing", "More puns"],
  values: ["More about work", "More about family", "Less serious", "More curious"],
  banned: ["No politics", "No exes", "No salary", "No religion"],
  ideal: ["More open", "More specific", "Less picky", "Mention hobbies"],
};

/** Each connected data source adds this much Twin accuracy (connect screen: 0% → +10% per tap). */
export const SOURCE_STEP = 10;

export function baseAccuracy(cards: PersonaCards, connections: string[]) {
  const filled = (["tone", "humor", "values", "banned", "ideal"] as const).filter(
    (k) => cards[k].trim().length > 0,
  ).length;
  return Math.min(100, filled * 8 + connections.length * SOURCE_STEP);
}

export function makeDefaultTwin(name = "Momo"): Twin {
  return {
    name,
    version: 0,
    cards: EMPTY_CARDS,
    sliders: DEFAULT_SLIDERS,
    banned: ["politics", "exes", "salary"],
    accuracy: 0,
    paused: false,
    history: [],
    connections: [],
  };
}
