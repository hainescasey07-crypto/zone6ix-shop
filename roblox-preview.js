const previewTranslate = value => window.zone6ixI18n?.t(value) ?? String(value ?? "");

const previewElements = {
  username: document.getElementById("robloxUsername"),
  shirt: document.getElementById("gangShirtLink"),
  pants: document.getElementById("gangPantsLink"),
  refresh: document.getElementById("refreshRobloxPreview"),
  placeholder: document.getElementById("robloxPreviewPlaceholder"),
  loading: document.getElementById("robloxPreviewLoading"),
  error: document.getElementById("robloxPreviewError"),
  grid: document.getElementById("robloxPreviewGrid"),
  avatarImage: document.getElementById("robloxAvatarImage"),
  avatarName: document.getElementById("robloxAvatarName"),
  avatarHandle: document.getElementById("robloxAvatarHandle"),
  profileLink: document.getElementById("robloxProfileLink"),
  shirtCard: document.getElementById("robloxShirtCard"),
  shirtImage: document.getElementById("robloxShirtImage"),
  shirtStatus: document.getElementById("robloxShirtStatus"),
  shirtOpen: document.getElementById("robloxShirtOpen"),
  pantsCard: document.getElementById("robloxPantsCard"),
  pantsImage: document.getElementById("robloxPantsImage"),
  pantsStatus: document.getElementById("robloxPantsStatus"),
  pantsOpen: document.getElementById("robloxPantsOpen")
};

let previewTimer = null;
let previewController = null;
let lastPreviewKey = "";

function setPreviewState(state, message = "") {
  if (previewElements.placeholder) previewElements.placeholder.hidden = state !== "placeholder";
  if (previewElements.loading) previewElements.loading.hidden = state !== "loading";
  if (previewElements.error) {
    previewElements.error.hidden = state !== "error";
    previewElements.error.textContent = message;
  }
  if (previewElements.grid) previewElements.grid.hidden = state !== "ready";
  if (previewElements.refresh) {
    previewElements.refresh.disabled = state === "loading";
    previewElements.refresh.textContent = previewTranslate(state === "loading" ? "Loading…" : "Refresh preview");
  }
}

function resetImage(image) {
  if (!image) return;
  image.removeAttribute("src");
  image.hidden = true;
  image.onerror = null;
}

function loadImage(image, url, fallback) {
  if (!image) return;
  resetImage(image);
  if (!url) {
    fallback?.();
    return;
  }
  image.hidden = false;
  image.src = url;
  image.onerror = () => {
    resetImage(image);
    fallback?.();
  };
}

function renderClothing(record, type) {
  const isShirt = type === "shirt";
  const card = isShirt ? previewElements.shirtCard : previewElements.pantsCard;
  const image = isShirt ? previewElements.shirtImage : previewElements.pantsImage;
  const status = isShirt ? previewElements.shirtStatus : previewElements.pantsStatus;
  const open = isShirt ? previewElements.shirtOpen : previewElements.pantsOpen;
  if (!card || !status || !open) return;

  card.dataset.state = record?.state || "NotAdded";
  open.hidden = true;
  open.removeAttribute("href");
  resetImage(image);

  if (!record?.id) {
    status.textContent = previewTranslate(record?.error || "Not added");
    return;
  }

  status.textContent = record.error ? previewTranslate(record.error) : (record.imageUrl ? `Asset ${record.id}` : previewTranslate("Thumbnail unavailable"));
  if (record.url) {
    open.href = record.url;
    open.hidden = false;
  }
  loadImage(image, record.imageUrl, () => {
    status.textContent = previewTranslate(record.error || "Thumbnail unavailable");
    card.dataset.state = "Unavailable";
  });
}

function renderPreview(data) {
  const player = data?.user || {};
  if (previewElements.avatarName) previewElements.avatarName.textContent = player.displayName || player.username || previewTranslate("Roblox player");
  if (previewElements.avatarHandle) previewElements.avatarHandle.textContent = player.username ? `@${player.username}` : "";
  if (previewElements.profileLink) {
    previewElements.profileLink.href = player.profileUrl || "#";
    previewElements.profileLink.hidden = !player.profileUrl;
  }
  loadImage(previewElements.avatarImage, player.avatarImageUrl, () => {
    if (previewElements.avatarHandle) previewElements.avatarHandle.textContent = `${previewElements.avatarHandle.textContent} · ${previewTranslate("Avatar thumbnail unavailable")}`;
  });
  renderClothing(data?.shirt, "shirt");
  renderClothing(data?.pants, "pants");
  setPreviewState("ready");
}

function previewKey() {
  return JSON.stringify([
    previewElements.username?.value.trim().replace(/^@/, "") || "",
    previewElements.shirt?.value.trim() || "",
    previewElements.pants?.value.trim() || ""
  ]);
}

async function loadPreview({ force = false } = {}) {
  const username = previewElements.username?.value.trim().replace(/^@/, "") || "";
  if (!username) {
    previewController?.abort();
    lastPreviewKey = "";
    setPreviewState("placeholder");
    return;
  }

  const key = previewKey();
  if (!force && key === lastPreviewKey) return;
  lastPreviewKey = key;
  previewController?.abort();
  previewController = new AbortController();
  setPreviewState("loading");

  const params = new URLSearchParams({ username });
  const shirt = previewElements.shirt?.value.trim() || "";
  const pants = previewElements.pants?.value.trim() || "";
  if (shirt) params.set("shirt", shirt);
  if (pants) params.set("pants", pants);

  try {
    const response = await fetch(`/api/roblox-preview?${params}`, {
      headers: { Accept: "application/json" },
      signal: previewController.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
    if (!response.ok) throw new Error(data.error || `Preview failed (${response.status}).`);
    renderPreview(data);
  } catch (error) {
    if (error?.name === "AbortError") return;
    lastPreviewKey = "";
    setPreviewState("error", previewTranslate(error.message || "Could not load the Roblox preview."));
  }
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => loadPreview(), 650);
}

[previewElements.username, previewElements.shirt, previewElements.pants].forEach(input => {
  input?.addEventListener("input", schedulePreview);
  input?.addEventListener("change", () => loadPreview({ force: true }));
  input?.addEventListener("blur", () => loadPreview());
});
previewElements.refresh?.addEventListener("click", () => loadPreview({ force: true }));
document.addEventListener("zone6ix-auth-change", () => setTimeout(schedulePreview, 250));
document.addEventListener("zone6ix-language-change", () => loadPreview({ force: true }));
window.addEventListener("pageshow", schedulePreview);
schedulePreview();
