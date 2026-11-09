import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import { WebSocketServer } from "ws";
import {
  getSession,
  getExistingSession,
  addViewer,
  handleInput,
  getStatus,
  destroySession,
  isLoggedIn,
  safeId,
} from "./lib/browser.js";
import { collect } from "./lib/instagram.js";

// dependency-free .env loader
try {
  const env = await fs.readFile(path.join(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const PORT = Number(process.env.PORT || 3100);
// Origins allowed to call this agent (comma-separated). The localhost default
// exists only for local development; production must set APP_ORIGIN.
const DEV = process.env.NODE_ENV !== "production";
const APP_ORIGINS = (process.env.APP_ORIGIN || (DEV ? "http://localhost:3000" : ""))
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (APP_ORIGINS.length === 0) {
  console.error("APP_ORIGIN is required in production (e.g. APP_ORIGIN=https://your-app.example)");
  process.exit(1);
}
const DATA_DIR = path.join(process.cwd(), "data");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && APP_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const userOf = (req) => safeId(String(req.query.user || req.body?.user || ""));
const fail = (res, e, code = 500) => res.status(code).json({ error: e.message || String(e) });

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "twindate-agent" }));

app.get("/api/status", async (req, res) => {
  try {
    res.json(await getStatus(userOf(req)));
  } catch (e) {
    fail(res, e, 400);
  }
});

// 1) Start the server browser on the Instagram login page. The user logs in via the live view.
app.post("/api/connect", async (req, res) => {
  try {
    const session = await getSession(userOf(req));
    if (!/instagram\.com/.test(session.page.url())) {
      const loggedIn = await isLoggedIn(session);
      await session.page
        .goto(loggedIn ? "https://www.instagram.com/" : "https://www.instagram.com/accounts/login/", {
          waitUntil: "domcontentloaded",
        })
        .catch(() => {});
    }
    res.json(await getStatus(session.userId));
  } catch (e) {
    fail(res, e);
  }
});

app.post("/api/disconnect", async (req, res) => {
  try {
    await destroySession(userOf(req));
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
});

// 2) Collect (runs in the background; poll /api/status for phase + progress)
app.post("/api/collect", async (req, res) => {
  try {
    const user = userOf(req);
    const session = await getSession(user);
    if (!(await isLoggedIn(session))) return res.status(409).json({ error: "Not logged in to Instagram yet." });
    if (session.busy) return res.json({ started: false, busy: true });
    collect(session, (phase, progress) => console.log(`[collect:${user}] ${phase}`, progress))
      .then(async (snapshot) => {
        const dir = path.join(DATA_DIR, user);
        await fs.mkdir(dir, { recursive: true });
        const id = snapshot.collectedAt.replace(/[:.]/g, "-");
        await fs.writeFile(path.join(dir, id + ".json"), JSON.stringify(snapshot, null, 2));
        session.lastSnapshotId = id;
        console.log(`[collect:${user}] saved ${id}`, snapshot.counts);
      })
      .catch((e) => console.error(`[collect:${user}] failed:`, e.message));
    res.json({ started: true });
  } catch (e) {
    fail(res, e);
  }
});

// 3) Snapshots
app.get("/api/snapshots", async (req, res) => {
  try {
    const dir = path.join(DATA_DIR, userOf(req));
    const files = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort().reverse();
    const list = [];
    for (const f of files.slice(0, 20)) {
      const s = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
      list.push({ id: f.replace(/\.json$/, ""), collectedAt: s.collectedAt, username: s.username, counts: s.counts });
    }
    res.json(list);
  } catch (e) {
    fail(res, e);
  }
});

app.get("/api/snapshots/:id", async (req, res) => {
  try {
    const id = req.params.id === "latest" ? null : req.params.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const dir = path.join(DATA_DIR, userOf(req));
    let file = id;
    if (!file) {
      const files = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
      file = files.at(-1)?.replace(/\.json$/, "");
    }
    if (!file) return res.status(404).json({ error: "no snapshot" });
    const full = req.query.full === "1";
    const s = JSON.parse(await fs.readFile(path.join(dir, file + ".json"), "utf8"));
    if (full) return res.json({ id: file, ...s });
    res.json({
      id: file,
      collectedAt: s.collectedAt,
      username: s.username,
      profile: s.profile,
      counts: s.counts,
      sampleFeed: s.feed.slice(0, 10),
      sampleFollowing: s.following.slice(0, 20).map((u) => u.username),
    });
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

// ---- WebSocket: live browser view ----
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/browser" });

wss.on("connection", async (ws, req) => {
  const user = new URL(req.url, "http://x").searchParams.get("user") || "";
  let session;
  try {
    session = getExistingSession(user) ?? (await getSession(user));
    await addViewer(session, ws);
  } catch (e) {
    ws.send(JSON.stringify({ type: "error", message: e.message }));
    return ws.close();
  }
  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    try {
      await handleInput(session, msg); // never log key input
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  TwinDate agent listening on :${PORT}  (allowed origins: ${APP_ORIGINS.join(", ")})\n`);
});
