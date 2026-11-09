// Server-side browser per user: persistent Chrome profile, CDP screencast to the
// app's live view, input relay (the user logs in themselves), login detection.
import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PROFILES_DIR = path.join(ROOT, "profiles");
const HEADLESS = (process.env.HEADLESS ?? "false") === "true";

// Mobile viewport + iPhone UA: Instagram serves its mobile web layout, which
// fits the 390px sheet in the app and makes follow lists plain scrollable pages.
export const VIEWPORT = { width: 390, height: 720 };
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const sessions = new Map(); // userId -> session

export function safeId(userId) {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(userId)) throw new Error("invalid user id");
  return userId;
}

export function getExistingSession(userId) {
  return sessions.get(safeId(userId)) ?? null;
}

export async function getSession(userId) {
  userId = safeId(userId);
  if (sessions.has(userId)) return sessions.get(userId);

  await fs.mkdir(PROFILES_DIR, { recursive: true });
  const userDataDir = path.join(PROFILES_DIR, userId);
  const base = {
    headless: HEADLESS,
    viewport: VIEWPORT,
    userAgent: MOBILE_UA,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: "en-US",
    timezoneId: "Asia/Seoul",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-infobars",
      `--window-size=${VIEWPORT.width + 20},${VIEWPORT.height + 120}`,
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  };

  let context;
  let engine = "chrome";
  try {
    context = await chromium.launchPersistentContext(userDataDir, { ...base, channel: "chrome" });
  } catch (e) {
    console.warn("[browser] system Chrome unavailable, using bundled Chromium:", e.message?.split("\n")[0]);
    engine = "chromium";
    context = await chromium.launchPersistentContext(userDataDir, base);
  }

  const session = {
    userId,
    context,
    engine,
    page: null,
    cdp: null,
    viewers: new Set(),
    streaming: false,
    // collection state, reported through /api/status
    busy: false,
    phase: "idle", // idle | profile | feed | reels | followers | following | done | error
    progress: {},
    error: null,
    lastSnapshotId: null,
  };
  session.page = context.pages()[0] ?? (await context.newPage());
  attachPageHandlers(session);

  context.on("close", () => {
    sessions.delete(userId);
    for (const ws of session.viewers) safeSend(ws, { type: "closed" });
  });

  sessions.set(userId, session);
  console.log(`[browser] session started for ${userId} (${engine}, headless=${HEADLESS})`);
  return session;
}

function attachPageHandlers(session) {
  const { page } = session;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) broadcast(session, { type: "url", url: frame.url() });
  });
  page.on("close", async () => {
    if (session.context.pages().length === 0) {
      try {
        session.page = await session.context.newPage();
        session.streaming = false;
        attachPageHandlers(session);
        if (session.viewers.size) await startStream(session);
      } catch {}
    }
  });
}

function safeSend(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}
export function broadcast(session, obj) {
  for (const ws of session.viewers) safeSend(ws, obj);
}

// ---------- screencast ----------
export async function startStream(session) {
  if (session.streaming) return;
  const cdp = await session.context.newCDPSession(session.page);
  session.cdp = cdp;
  cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
    broadcast(session, { type: "frame", data });
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch {}
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 70,
    maxWidth: VIEWPORT.width * 2,
    maxHeight: VIEWPORT.height * 2,
    everyNthFrame: 1,
  });
  session.streaming = true;
}

export async function stopStreamIfIdle(session) {
  if (session.viewers.size > 0 || !session.streaming) return;
  try {
    await session.cdp?.send("Page.stopScreencast");
    await session.cdp?.detach();
  } catch {}
  session.cdp = null;
  session.streaming = false;
}

export async function addViewer(session, ws) {
  session.viewers.add(ws);
  await startStream(session);
  safeSend(ws, { type: "url", url: session.page.url() });
  try {
    await session.page.mouse.move(1, 1);
  } catch {}
  ws.on("close", () => {
    session.viewers.delete(ws);
    setTimeout(() => stopStreamIfIdle(session), 5000);
  });
}

// ---------- input relay (user operates the live view) ----------
export async function handleInput(session, msg) {
  const { page } = session;
  if (session.busy) return; // don't let clicks interfere while the agent is collecting
  switch (msg.type) {
    case "click":
      await page.mouse.click(clamp(msg.x, 0, VIEWPORT.width), clamp(msg.y, 0, VIEWPORT.height), {
        button: msg.button === 2 ? "right" : "left",
        clickCount: msg.detail || 1,
      });
      break;
    case "move":
      await page.mouse.move(clamp(msg.x, 0, VIEWPORT.width), clamp(msg.y, 0, VIEWPORT.height));
      break;
    case "wheel":
      await page.mouse.move(clamp(msg.x, 0, VIEWPORT.width), clamp(msg.y, 0, VIEWPORT.height));
      await page.mouse.wheel(0, clamp(msg.dy, -800, 800));
      break;
    case "key": {
      const mods = [];
      if (msg.ctrl) mods.push("Control");
      if (msg.meta) mods.push("Meta");
      if (msg.alt) mods.push("Alt");
      if (msg.shift && msg.key.length > 1) mods.push("Shift");
      if (msg.key.length === 1 && mods.length === 0) {
        await page.keyboard.insertText(msg.key);
      } else {
        await page.keyboard.press([...mods, msg.key].join("+"));
      }
      break;
    }
    case "text":
      await page.keyboard.insertText(String(msg.text ?? ""));
      break;
    case "navigate": {
      const url = String(msg.url || "");
      if (!/^https:\/\/(www\.)?instagram\.com\//.test(url)) throw new Error("URL not allowed");
      await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
      break;
    }
    case "back":
      await page.goBack().catch(() => {});
      break;
    default:
      throw new Error("unknown input: " + msg.type);
  }
}

function clamp(n, lo, hi) {
  n = Number(n) || 0;
  return Math.max(lo, Math.min(hi, n));
}

// ---------- status ----------
export async function isLoggedIn(session) {
  const cookies = await session.context.cookies(["https://www.instagram.com"]);
  return cookies.some((c) => c.name === "sessionid" && c.value);
}

export async function getStatus(userId) {
  userId = safeId(userId);
  const session = sessions.get(userId);
  if (!session) return { started: false, loggedIn: false, busy: false, phase: "idle" };
  return {
    started: true,
    loggedIn: await isLoggedIn(session),
    engine: session.engine,
    url: session.page?.url(),
    busy: session.busy,
    phase: session.phase,
    progress: session.progress,
    error: session.error,
    lastSnapshotId: session.lastSnapshotId,
  };
}

export async function destroySession(userId) {
  userId = safeId(userId);
  const session = sessions.get(userId);
  if (session) {
    try {
      await session.context.close();
    } catch {}
    sessions.delete(userId);
  }
  await fs.rm(path.join(PROFILES_DIR, userId), { recursive: true, force: true });
}
