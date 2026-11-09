// Instagram collection. Read-only: we never like, follow, comment or post.
//
// Strategy: let the real page load and capture the JSON responses it fetches
// (feed timeline, reels, follow lists) — those are stable structured payloads.
// Where the page does not fetch what we need, call the same web endpoints the
// page itself uses, from inside the page (same cookies, same headers).
import { VIEWPORT } from "./browser.js";

const FOLLOW_LIMIT = Number(process.env.FOLLOW_LIMIT || 2000);
const IG_APP_ID = "936619743392459"; // the public web app id the site sends on every request

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const human = (lo = 700, hi = 1600) => sleep(lo + Math.random() * (hi - lo));

export async function collect(session, onPhase = () => {}) {
  if (session.busy) throw new Error("already collecting");
  session.busy = true;
  session.error = null;
  session.progress = {};
  const setPhase = (phase, extra = {}) => {
    session.phase = phase;
    session.progress = { ...session.progress, ...extra };
    onPhase(phase, session.progress);
  };

  const page = session.page; // reuse the logged-in tab so the user sees progress in the live view
  const captured = { feed: new Map(), reels: new Map(), explore: new Map() };
  let bucket = null;

  const onResponse = async (res) => {
    try {
      const url = res.url();
      if (!/instagram\.com\/(api\/v1\/|graphql\/query)/.test(url)) return;
      const ct = res.headers()["content-type"] || "";
      if (!ct.includes("json")) return;
      const json = await res.json().catch(() => null);
      if (!json || !bucket) return;
      for (const m of extractMedia(json)) captured[bucket].set(m.id, m);
    } catch {}
  };
  page.on("response", onResponse);

  try {
    setPhase("profile");
    const me = await currentUser(page);
    const profile = me ? await profileInfo(page, me.username) : null;
    setPhase("profile", { username: me?.username ?? null });

    // 1) Home feed: whatever the algorithm shows first, plus a couple of scrolls
    setPhase("feed");
    bucket = "feed";
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await human(2500, 3500);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, VIEWPORT.height * 1.5);
      await human(1500, 2500);
      setPhase("feed", { feed: captured.feed.size });
    }
    if (captured.feed.size === 0) {
      for (const m of await domFeed(page)) captured.feed.set(m.id, m);
    }
    setPhase("feed", { feed: captured.feed.size });

    // 2) Reels tab: first reels the algorithm serves
    setPhase("reels");
    bucket = "reels";
    await page.goto("https://www.instagram.com/reels/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    await human(2500, 3500);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, VIEWPORT.height);
      await human(1500, 2500);
    }
    setPhase("reels", { reels: captured.reels.size });

    // 3) Explore grid
    setPhase("explore");
    bucket = "explore";
    await page.goto("https://www.instagram.com/explore/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    await human(2500, 3500);
    await page.mouse.wheel(0, VIEWPORT.height);
    await human(1500, 2500);
    setPhase("explore", { explore: captured.explore.size });
    bucket = null;

    // 4) Followers / following via the same endpoints the site uses
    let followers = [];
    let following = [];
    if (me?.pk) {
      setPhase("followers");
      followers = await followList(page, me.pk, "followers", (n) => setPhase("followers", { followers: n }));
      setPhase("following");
      following = await followList(page, me.pk, "following", (n) => setPhase("following", { following: n }));
    }

    const snapshot = {
      collectedAt: new Date().toISOString(),
      username: me?.username ?? null,
      profile,
      feed: [...captured.feed.values()],
      reels: [...captured.reels.values()],
      explore: [...captured.explore.values()],
      followers,
      following,
      counts: {
        feed: captured.feed.size,
        reels: captured.reels.size,
        explore: captured.explore.size,
        followers: followers.length,
        following: following.length,
        followerTotal: profile?.followerCount ?? null,
        followingTotal: profile?.followingCount ?? null,
      },
    };
    setPhase("done", snapshot.counts);
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
    return snapshot;
  } catch (e) {
    session.error = e.message;
    setPhase("error");
    throw e;
  } finally {
    page.off("response", onResponse);
    session.busy = false;
  }
}

// ---------- in-page calls (same session cookies as the logged-in user) ----------

async function igFetch(page, path) {
  return page.evaluate(
    async ([p, appId]) => {
      const res = await fetch(p, {
        headers: { "x-ig-app-id": appId, "x-requested-with": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) return { __status: res.status };
      return res.json();
    },
    [path, IG_APP_ID],
  );
}

async function currentUser(page) {
  // cookie ds_user_id is the numeric id; the accounts endpoint gives the username
  const cookies = await page.context().cookies(["https://www.instagram.com"]);
  const pk = cookies.find((c) => c.name === "ds_user_id")?.value ?? null;
  const json = await igFetch(page, "/api/v1/accounts/current_user/?edit=true").catch(() => null);
  const u = json?.user;
  if (u?.username) return { pk: String(u.pk ?? pk), username: u.username, fullName: u.full_name ?? "" };
  if (pk) return { pk, username: null, fullName: "" };
  return null;
}

async function profileInfo(page, username) {
  if (!username) return null;
  const json = await igFetch(page, `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`).catch(() => null);
  const u = json?.data?.user;
  if (!u) return null;
  return {
    username: u.username,
    fullName: u.full_name ?? "",
    bio: u.biography ?? "",
    isPrivate: !!u.is_private,
    followerCount: u.edge_followed_by?.count ?? null,
    followingCount: u.edge_follow?.count ?? null,
    postCount: u.edge_owner_to_timeline_media?.count ?? null,
    category: u.category_name ?? null,
  };
}

async function followList(page, pk, kind, onCount) {
  const out = [];
  let maxId = null;
  for (let i = 0; i < 200 && out.length < FOLLOW_LIMIT; i++) {
    const q = `count=50${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ""}&search_surface=follow_list_page`;
    const json = await igFetch(page, `/api/v1/friendships/${pk}/${kind}/?${q}`).catch(() => null);
    if (!json || json.__status) {
      if (json?.__status === 429) await sleep(15000); // rate limited: back off once, then stop
      break;
    }
    for (const u of json.users ?? []) {
      out.push({
        pk: String(u.pk),
        username: u.username,
        fullName: u.full_name ?? "",
        isPrivate: !!u.is_private,
        isVerified: !!u.is_verified,
      });
    }
    onCount(out.length);
    maxId = json.next_max_id ?? null;
    if (!maxId || !(json.users ?? []).length) break;
    await human(900, 1800);
  }
  return out.slice(0, FOLLOW_LIMIT);
}

// ---------- extraction from captured JSON ----------

/** Walks any Instagram JSON payload and pulls out media items (posts/reels). */
export function extractMedia(root) {
  const out = [];
  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 60) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, depth + 1);
      return;
    }
    const m = node.media && typeof node.media === "object" ? node.media : node;
    if (m && (m.code || m.shortcode) && (m.user || m.owner) && (m.media_type != null || m.__typename)) {
      const id = String(m.pk ?? m.id ?? m.code ?? m.shortcode);
      if (!seen.has(id)) {
        seen.add(id);
        const user = m.user ?? m.owner ?? {};
        const caption =
          m.caption?.text ?? m.edge_media_to_caption?.edges?.[0]?.node?.text ?? m.accessibility_caption ?? "";
        out.push({
          id,
          code: m.code ?? m.shortcode ?? null,
          author: user.username ?? null,
          authorName: user.full_name ?? null,
          caption: String(caption).slice(0, 500),
          type: m.product_type ?? (m.media_type === 2 ? "video" : m.media_type === 8 ? "carousel" : "image"),
          likes: m.like_count ?? m.edge_media_preview_like?.count ?? null,
          comments: m.comment_count ?? m.edge_media_to_comment?.count ?? null,
          takenAt: m.taken_at ? new Date(m.taken_at * 1000).toISOString() : null,
          isAd: !!(m.is_ad || m.injected || node.injected),
          url: m.code ? `https://www.instagram.com/p/${m.code}/` : null,
        });
      }
      if (m !== node) return;
    }
    for (const k in node) walk(node[k], depth + 1);
  };
  walk(root, 0);
  return out;
}

/** DOM fallback for the home feed if no JSON was captured. */
async function domFeed(page) {
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    for (const a of document.querySelectorAll("article")) {
      const link = a.querySelector('a[href^="/"][href*="/p/"], a[href^="/"][href*="/reel/"]');
      const authorEl = a.querySelector('header a[href^="/"]');
      const code = link?.getAttribute("href")?.split("/").filter(Boolean)[1] ?? null;
      const id = code ?? authorEl?.textContent ?? String(out.length);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        code,
        author: authorEl?.textContent?.trim() ?? null,
        authorName: null,
        caption: (a.querySelector("h1, [data-testid='post-comment-root']")?.textContent ?? "").slice(0, 500),
        type: a.querySelector("video") ? "video" : "image",
        likes: null,
        comments: null,
        takenAt: null,
        isAd: /Sponsored/i.test(a.textContent ?? ""),
        url: code ? `https://www.instagram.com/p/${code}/` : null,
      });
    }
    return out;
  });
}
