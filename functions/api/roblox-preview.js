import { json } from "../_lib/common.js";

const CACHE_ORIGIN = "https://zone6ix-preview-cache.internal";

function cleanUsername(value) {
  const username = String(value || "").trim().replace(/^@/, "");
  if (!username) throw Object.assign(new Error("Enter a Roblox username first."), { status: 400 });
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw Object.assign(new Error("Enter a valid Roblox username."), { status: 400 });
  }
  return username;
}

function parseAssetId(value) {
  const input = String(value || "").trim();
  if (!input) return { id: "", url: "", error: "" };
  if (/^\d{1,20}$/.test(input)) {
    return { id: input, url: `https://www.roblox.com/catalog/${input}`, error: "" };
  }
  let parsed;
  try { parsed = new URL(input); } catch {
    return { id: "", url: "", error: "Use a full Roblox clothing link." };
  }
  if (!/(^|\.)roblox\.com$/i.test(parsed.hostname)) {
    return { id: "", url: "", error: "Use a Roblox clothing link." };
  }
  const pathMatch = parsed.pathname.match(/\/(?:catalog|library)\/(\d+)/i)
    || parsed.pathname.match(/\/store\/asset\/(\d+)/i)
    || parsed.pathname.match(/\/(\d+)(?:\/|$)/);
  const queryId = parsed.searchParams.get("id");
  const id = pathMatch?.[1] || (/^\d{1,20}$/.test(queryId || "") ? queryId : "");
  if (!id) return { id: "", url: "", error: "Could not find an asset ID in that Roblox link." };
  return { id, url: `https://www.roblox.com/catalog/${id}`, error: "" };
}

function cacheRequest(namespace, key) {
  const safeNamespace = encodeURIComponent(String(namespace || "preview"));
  const safeKey = encodeURIComponent(String(key || "default"));
  return new Request(`${CACHE_ORIGIN}/${safeNamespace}/${safeKey}`, { method: "GET" });
}

function getCache() {
  try {
    return globalThis.caches?.default || null;
  } catch {
    return null;
  }
}

async function readCachedJson(namespace, key) {
  const cache = getCache();
  if (!cache) return null;
  try {
    const response = await cache.match(cacheRequest(namespace, key));
    if (!response) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function writeCachedJson(namespace, key, value, ttlSeconds) {
  const cache = getCache();
  if (!cache) return;
  try {
    await cache.put(cacheRequest(namespace, key), new Response(JSON.stringify(value), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${ttlSeconds}`
      }
    }));
  } catch {
    // Preview caching is an optimisation. A cache failure must not break checkout.
  }
}

async function cachedJson(namespace, key, ttlSeconds, loader) {
  const cached = await readCachedJson(namespace, key);
  if (cached) return cached;
  const value = await loader();
  await writeCachedJson(namespace, key, value, ttlSeconds);
  return value;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.errors?.[0]?.message || data?.message || `Roblox request failed (${response.status}).`;
      const error = new Error(message);
      error.status = response.status;
      error.retryAfter = response.headers.get("Retry-After") || "";
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function directAvatarThumbnailUrl(userId) {
  const params = new URLSearchParams({
    userId: String(userId),
    width: "420",
    height: "420",
    format: "png"
  });
  return `https://www.roblox.com/headshot-thumbnail/image?${params}`;
}

function directAssetThumbnailUrl(assetId) {
  const params = new URLSearchParams({
    assetId: String(assetId),
    width: "420",
    height: "420",
    format: "png"
  });
  return `https://www.roblox.com/asset-thumbnail/image?${params}`;
}

async function getUser(username) {
  return cachedJson("user", username.toLowerCase(), 21600, async () => {
    const data = await fetchJson("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    const user = data?.data?.[0];
    if (!user?.id) throw Object.assign(new Error("That Roblox username could not be found."), { status: 404 });
    return user;
  });
}

async function getAvatarThumbnail(userId) {
  const fallback = {
    imageUrl: directAvatarThumbnailUrl(userId),
    state: "Fallback"
  };

  try {
    return await cachedJson("avatar", String(userId), 600, async () => {
      const params = new URLSearchParams({
        userIds: String(userId),
        size: "420x420",
        format: "Png",
        isCircular: "false"
      });
      const data = await fetchJson(`https://thumbnails.roblox.com/v1/users/avatar?${params}`);
      const thumb = data?.data?.[0] || {};
      return {
        imageUrl: thumb.imageUrl || fallback.imageUrl,
        state: thumb.state || (thumb.imageUrl ? "Completed" : "Fallback")
      };
    });
  } catch {
    // Avoid immediately repeating a failing shared-IP thumbnail request.
    await writeCachedJson("avatar", String(userId), fallback, 120);
    return fallback;
  }
}

async function getAssetThumbnails() {
  // Clothing images deliberately load through Roblox's direct thumbnail image
  // route in the customer's browser. This removes the server-side asset
  // thumbnail API call that was returning 429 Too Many Requests.
  return new Map();
}

function mapAsset(record, type, assetThumbs) {
  if (record.error) return { type, id: "", url: "", imageUrl: "", state: "Invalid", error: record.error };
  if (!record.id) return { type, id: "", url: "", imageUrl: "", state: "NotAdded", error: "" };

  const thumb = assetThumbs.get(String(record.id)) || {};
  return {
    type,
    id: record.id,
    url: record.url,
    imageUrl: thumb.imageUrl || directAssetThumbnailUrl(record.id),
    state: thumb.state || "Fallback",
    error: ""
  };
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const username = cleanUsername(url.searchParams.get("username"));
    const shirt = parseAssetId(url.searchParams.get("shirt"));
    const pants = parseAssetId(url.searchParams.get("pants"));
    const previewCacheKey = [username.toLowerCase(), shirt.id || shirt.error, pants.id || pants.error].join("|");

    const cachedPreview = await readCachedJson("preview", previewCacheKey);
    if (cachedPreview) {
      return json(cachedPreview, 200, {
        "Cache-Control": "public, max-age=60, s-maxage=120",
        "X-Zone6ix-Preview-Cache": "HIT"
      });
    }

    const user = await getUser(username);
    const [avatar, assetThumbs] = await Promise.all([
      getAvatarThumbnail(user.id),
      getAssetThumbnails([shirt, pants])
    ]);

    const payload = {
      user: {
        id: String(user.id),
        username: user.name || username,
        displayName: user.displayName || user.name || username,
        profileUrl: `https://www.roblox.com/users/${user.id}/profile`,
        avatarImageUrl: avatar.imageUrl,
        avatarState: avatar.state
      },
      shirt: mapAsset(shirt, "shirt", assetThumbs),
      pants: mapAsset(pants, "pants", assetThumbs)
    };

    await writeCachedJson("preview", previewCacheKey, payload, 120);

    return json(payload, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=120",
      "X-Zone6ix-Preview-Cache": "MISS"
    });
  } catch (error) {
    const status = Number(error?.status) || (error?.name === "AbortError" ? 504 : 502);
    let message = error?.name === "AbortError"
      ? "Roblox took too long to respond. Try again."
      : (error.message || "Could not load the Roblox preview.");

    if (status === 429 || /too many requests/i.test(message)) {
      message = "Roblox is temporarily limiting preview requests. The preview will retry automatically.";
    }

    const headers = status === 429 ? { "Retry-After": String(error?.retryAfter || "2") } : {};
    return json({ error: message }, status, headers);
  }
}
