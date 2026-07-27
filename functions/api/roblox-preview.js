import { json } from "../_lib/common.js";

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

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.errors?.[0]?.message || data?.message || `Roblox request failed (${response.status}).`;
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getUser(username) {
  const data = await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });
  const user = data?.data?.[0];
  if (!user?.id) throw Object.assign(new Error("That Roblox username could not be found."), { status: 404 });
  return user;
}

async function getAvatarThumbnail(userId) {
  const params = new URLSearchParams({
    userIds: String(userId),
    size: "420x420",
    format: "Png",
    isCircular: "false"
  });
  const data = await fetchJson(`https://thumbnails.roblox.com/v1/users/avatar?${params}`);
  const thumb = data?.data?.[0] || {};
  return { imageUrl: thumb.imageUrl || "", state: thumb.state || "Unavailable" };
}

async function getAssetThumbnails(assetRecords) {
  const ids = assetRecords.filter(item => item.id).map(item => item.id);
  if (!ids.length) return new Map();
  const params = new URLSearchParams({
    assetIds: ids.join(","),
    returnPolicy: "PlaceHolder",
    size: "420x420",
    format: "Png",
    isCircular: "false"
  });
  const data = await fetchJson(`https://thumbnails.roblox.com/v1/assets?${params}`);
  return new Map((data?.data || []).map(item => [String(item.targetId), item]));
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const username = cleanUsername(url.searchParams.get("username"));
    const shirt = parseAssetId(url.searchParams.get("shirt"));
    const pants = parseAssetId(url.searchParams.get("pants"));

    const user = await getUser(username);
    const [avatar, assetThumbs] = await Promise.all([
      getAvatarThumbnail(user.id),
      getAssetThumbnails([shirt, pants])
    ]);

    const mapAsset = (record, type) => {
      if (record.error) return { type, id: "", url: "", imageUrl: "", state: "Invalid", error: record.error };
      if (!record.id) return { type, id: "", url: "", imageUrl: "", state: "NotAdded", error: "" };
      const thumb = assetThumbs.get(String(record.id)) || {};
      return {
        type,
        id: record.id,
        url: record.url,
        imageUrl: thumb.imageUrl || "",
        state: thumb.state || "Unavailable",
        error: thumb.imageUrl ? "" : "Roblox could not load a thumbnail for this asset."
      };
    };

    return json({
      user: {
        id: String(user.id),
        username: user.name || username,
        displayName: user.displayName || user.name || username,
        profileUrl: `https://www.roblox.com/users/${user.id}/profile`,
        avatarImageUrl: avatar.imageUrl,
        avatarState: avatar.state
      },
      shirt: mapAsset(shirt, "shirt"),
      pants: mapAsset(pants, "pants")
    }, 200, { "Cache-Control": "public, max-age=30, s-maxage=60" });
  } catch (error) {
    const status = Number(error?.status) || (error?.name === "AbortError" ? 504 : 502);
    return json({ error: error?.name === "AbortError" ? "Roblox took too long to respond. Try again." : (error.message || "Could not load the Roblox preview.") }, status);
  }
}
