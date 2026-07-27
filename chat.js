const escapeHtml = value => {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
};

const displayIdentity = value => window.zone6ixDisplayIdentity?.(value, "Owner") ?? String(value ?? "");
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

let authApi = null;
let user = null;
let permissions = {};
let customerState = {
  conversations: [],
  conversation: null,
  messages: [],
  settings: { status: "offline", replyText: "Leave a message", displayName: "Zone6ix Support" },
  orders: [],
  adminTyping: false,
  image: null,
  fingerprint: ""
};
let adminState = {
  conversations: [],
  conversation: null,
  messages: [],
  settings: { status: "offline", replyText: "Usually replies as soon as possible", displayName: "Zone6ix Support" },
  customerOrders: [],
  customerTyping: false,
  image: null,
  fingerprint: ""
};
let customerPoll = null;
let adminPoll = null;
let customerTypingTimer = null;
let adminTypingTimer = null;
let lastCustomerUnread = 0;
let lastAdminUnread = 0;

const el = Object.fromEntries([
  "supportChatLauncher", "supportLauncherStatus", "supportChatBadge", "supportMenuButton", "supportMenuBadge",
  "supportChatPanel", "supportMinimise", "supportDisplayName", "supportStatusDot", "supportStatusText", "supportReplyText",
  "supportChatToolbar", "supportConversationSelect", "supportNewConversation", "supportChatSignin", "supportSignIn",
  "supportChatStart", "supportOrderSelect", "supportStartConversation", "supportStartMessage", "supportChatActive",
  "supportConversationMeta", "supportMessageList", "supportAdminTyping", "supportImagePreview", "supportComposeForm",
  "supportImageInput", "supportMessageInput", "supportSendButton", "supportConversationToggle", "supportComposeMessage",
  "adminChatTab", "adminChatBadge", "refreshAdminChat", "adminChatSearch", "adminChatFilter", "adminChatList",
  "adminSupportStatus", "adminSupportDisplayName", "adminSupportReplyText", "saveSupportSettings", "supportSettingsMessage",
  "adminChatEmpty", "adminChatConversation", "adminChatConversationHead", "adminChatMessages", "supportCustomerTyping",
  "adminSupportImagePreview", "adminSupportCompose", "adminSupportImageInput", "adminSupportMessage", "supportQuickReplies",
  "adminSupportComposeMessage", "adminChatCustomerDetails", "adminChatOrderSelect", "adminChatInternalNote",
  "adminChatStatus", "adminChatBlocked", "saveAdminConversation", "adminConversationMessage"
].map(id => [id, document.getElementById(id)]));

function parseDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text.includes("T") ? text : `${text.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, compact = false) {
  const date = parseDate(value);
  if (!date) return "";
  return (compact ? timeFormatter : dateFormatter).format(date);
}

function conversationLabel(conversation) {
  const order = conversation.orderCode ? ` · ${conversation.orderCode}` : "";
  const date = formatDate(conversation.lastMessageAt || conversation.createdAt);
  return `${conversation.status === "open" ? "Open" : conversation.status === "closed" ? "Closed" : "Archived"}${order}${date ? ` · ${date}` : ""}`;
}

function totalUnread(conversations, key) {
  return conversations.reduce((sum, item) => sum + Number(item[key] || 0), 0);
}

function setBadge(node, value) {
  if (!node) return;
  const count = Math.max(0, Number(value) || 0);
  node.hidden = count === 0;
  node.textContent = count > 99 ? "99+" : String(count);
}

function updateBadges() {
  const customerUnread = totalUnread(customerState.conversations, "unreadCustomer");
  setBadge(el.supportChatBadge, customerUnread);
  setBadge(el.supportMenuBadge, customerUnread);
  const adminUnread = totalUnread(adminState.conversations, "unreadAdmin");
  setBadge(el.adminChatBadge, adminUnread);
  if (customerUnread > lastCustomerUnread && (document.hidden || !el.supportChatPanel?.classList.contains("open"))) {
    playNotification();
    showToast("New reply from Zone6ix Support");
  }
  if (adminUnread > lastAdminUnread && document.hidden) playNotification();
  lastCustomerUnread = customerUnread;
  lastAdminUnread = adminUnread;
}

function showToast(message) {
  let toast = document.getElementById("supportToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "supportToast";
    toast.className = "support-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 3500);
}

function playNotification() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => context.close();
  } catch {}
}

function setSupportPresence(settings = customerState.settings) {
  const status = settings.status || "offline";
  const statusText = status === "online" ? "Online" : status === "away" ? "Away" : "Offline";
  if (el.supportDisplayName) el.supportDisplayName.textContent = settings.displayName || "Zone6ix Support";
  if (el.supportStatusText) el.supportStatusText.textContent = statusText;
  if (el.supportReplyText) el.supportReplyText.textContent = settings.replyText || "Leave a message";
  if (el.supportStatusDot) el.supportStatusDot.dataset.status = status;
  if (el.supportLauncherStatus) {
    el.supportLauncherStatus.textContent = user ? `${statusText} · ${settings.replyText || "Leave a message"}` : "Sign in to chat";
  }
}

function showCustomerView(name) {
  if (el.supportChatSignin) el.supportChatSignin.hidden = name !== "signin";
  if (el.supportChatStart) el.supportChatStart.hidden = name !== "start";
  if (el.supportChatActive) el.supportChatActive.hidden = name !== "active";
  if (el.supportChatToolbar) el.supportChatToolbar.hidden = !user || customerState.conversations.length === 0;
}

function renderConversationSelect() {
  if (!el.supportConversationSelect) return;
  const selectedId = customerState.conversation?.id || "";
  el.supportConversationSelect.innerHTML = customerState.conversations.map(conversation => `
    <option value="${escapeHtml(conversation.id)}" ${conversation.id === selectedId ? "selected" : ""}>
      ${escapeHtml(`${conversation.orderCode || "General support"} · ${conversation.status}${conversation.unreadCustomer ? ` · ${conversation.unreadCustomer} new` : ""}`)}
    </option>
  `).join("");
}

function renderOrderSelect() {
  if (!el.supportOrderSelect) return;
  el.supportOrderSelect.innerHTML = `<option value="">General support</option>${customerState.orders.map(order => `
    <option value="${escapeHtml(order.id)}">${escapeHtml(order.order_code)} · ${escapeHtml(String(order.order_status || "").replaceAll("_", " "))}</option>
  `).join("")}`;
}

function messageMarkup(message, viewerType) {
  const own = message.senderType === viewerType;
  const seen = viewerType === "customer" ? message.readByAdminAt : message.readByCustomerAt;
  const sender = message.senderType === "admin" ? "Zone6ix Support" : (message.senderName || "Customer");
  const image = message.imageData ? `<a class="support-message-image" href="${escapeHtml(message.imageData)}" target="_blank" rel="noopener"><img src="${escapeHtml(message.imageData)}" alt="${escapeHtml(message.imageName || "Attached image")}"></a>` : "";
  const body = message.message ? `<p>${escapeHtml(message.message).replaceAll("\n", "<br>")}</p>` : "";
  return `<article class="support-message ${own ? "own" : "other"}" data-message-id="${escapeHtml(message.id)}">
    <div class="support-message-bubble">${!own ? `<small>${escapeHtml(sender)}</small>` : ""}${image}${body}</div>
    <footer><time>${escapeHtml(formatDate(message.createdAt, true))}</time>${own ? `<span>${seen ? "Seen" : "Sent"}</span>` : ""}</footer>
  </article>`;
}

function renderMessages(container, messages, viewerType) {
  if (!container) return;
  const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
  if (!messages.length) {
    container.innerHTML = `<div class="support-thread-empty"><strong>No messages yet</strong><span>Send the first message below.</span></div>`;
    return;
  }
  container.innerHTML = messages.map(message => messageMarkup(message, viewerType)).join("");
  if (nearBottom || !container.dataset.rendered) {
    container.scrollTop = container.scrollHeight;
    container.dataset.rendered = "1";
  }
}

function renderCustomer() {
  setSupportPresence();
  updateBadges();
  if (!user) {
    showCustomerView("signin");
    return;
  }
  renderConversationSelect();
  renderOrderSelect();
  if (!customerState.conversation) {
    showCustomerView("start");
    return;
  }
  showCustomerView("active");
  const conversation = customerState.conversation;
  if (el.supportConversationMeta) {
    el.supportConversationMeta.innerHTML = `<span class="support-state status-${escapeHtml(conversation.status)}">${escapeHtml(conversation.status)}</span><strong>${escapeHtml(conversation.orderCode || "General support")}</strong>${conversation.blocked ? `<b>Messaging blocked</b>` : ""}`;
  }
  renderMessages(el.supportMessageList, customerState.messages, "customer");
  if (el.supportAdminTyping) el.supportAdminTyping.hidden = !customerState.adminTyping;
  const disabled = conversation.blocked || conversation.status === "archived" || conversation.status === "closed";
  if (el.supportMessageInput) el.supportMessageInput.disabled = disabled;
  if (el.supportImageInput) el.supportImageInput.disabled = disabled;
  if (el.supportSendButton) el.supportSendButton.disabled = disabled;
  if (el.supportConversationToggle) {
    el.supportConversationToggle.hidden = conversation.status === "archived" || conversation.blocked;
    el.supportConversationToggle.textContent = conversation.status === "closed" ? "Reopen conversation" : "Close conversation";
  }
  if (el.supportComposeMessage) {
    el.supportComposeMessage.textContent = conversation.blocked ? "Messaging has been blocked for this conversation." : conversation.status === "archived" ? "This conversation is archived." : conversation.status === "closed" ? "Reopen the conversation to send another message." : "";
  }
}

async function customerFetch(conversationId = customerState.conversation?.id || "", { markRead = false, force = false } = {}) {
  if (!authApi || !user) return;
  const query = new URLSearchParams();
  if (conversationId) query.set("conversationId", conversationId);
  if (markRead) query.set("markRead", "1");
  const data = await authApi.apiFetch(`/api/chat?${query.toString()}`);
  const fingerprint = JSON.stringify({ conversations: data.conversations, conversation: data.conversation, messages: data.messages, settings: data.settings, typing: data.adminTyping });
  if (!force && fingerprint === customerState.fingerprint) return;
  customerState = {
    ...customerState,
    conversations: data.conversations || [],
    conversation: data.conversation || null,
    messages: data.messages || [],
    settings: data.settings || customerState.settings,
    orders: data.orders || customerState.orders,
    adminTyping: Boolean(data.adminTyping),
    fingerprint
  };
  renderCustomer();
}

async function openSupport() {
  el.supportChatPanel?.classList.add("open");
  el.supportChatPanel?.setAttribute("aria-hidden", "false");
  el.supportChatLauncher?.setAttribute("aria-expanded", "true");
  if (!user) {
    renderCustomer();
    return;
  }
  const id = customerState.conversation?.id || customerState.conversations[0]?.id || "";
  await customerFetch(id, { markRead: true, force: true }).catch(error => showToast(error.message));
}

function closeSupport() {
  el.supportChatPanel?.classList.remove("open");
  el.supportChatPanel?.setAttribute("aria-hidden", "true");
  el.supportChatLauncher?.setAttribute("aria-expanded", "false");
}

async function createCustomerConversation() {
  if (!authApi || !user) return;
  if (el.supportStartConversation) el.supportStartConversation.disabled = true;
  if (el.supportStartMessage) el.supportStartMessage.textContent = "Starting chat…";
  try {
    const data = await authApi.apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ action: "createConversation", orderId: el.supportOrderSelect?.value || "" })
    });
    customerState.conversation = data.conversation;
    await customerFetch(data.conversation.id, { markRead: true, force: true });
    el.supportMessageInput?.focus();
  } catch (error) {
    if (el.supportStartMessage) el.supportStartMessage.textContent = error.message;
  } finally {
    if (el.supportStartConversation) el.supportStartConversation.disabled = false;
  }
}

async function compressImage(file) {
  if (!file) return null;
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const max = 1200;
  if (Math.max(width, height) > max) {
    const ratio = max / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#0b0e12";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  let quality = 0.82;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 450000 && quality > 0.35) {
    quality -= 0.1;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > 450000) throw new Error("The image could not be compressed enough. Choose a smaller image.");
  return { data, name: file.name.replace(/\.[^.]+$/, ".jpg") };
}

function renderImagePreview(node, image, clearHandler) {
  if (!node) return;
  node.hidden = !image;
  node.innerHTML = image ? `<img src="${escapeHtml(image.data)}" alt="Image ready to send"><span>${escapeHtml(image.name)}</span><button type="button" aria-label="Remove image">×</button>` : "";
  node.querySelector("button")?.addEventListener("click", clearHandler);
}

async function sendCustomerMessage(event) {
  event.preventDefault();
  const conversation = customerState.conversation;
  if (!conversation) return;
  const message = el.supportMessageInput?.value.trim() || "";
  if (!message && !customerState.image) return;
  if (el.supportSendButton) el.supportSendButton.disabled = true;
  if (el.supportComposeMessage) el.supportComposeMessage.textContent = "Sending…";
  try {
    await authApi.apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        action: "sendMessage",
        conversationId: conversation.id,
        message,
        imageData: customerState.image?.data || "",
        imageName: customerState.image?.name || ""
      })
    });
    if (el.supportMessageInput) el.supportMessageInput.value = "";
    customerState.image = null;
    renderImagePreview(el.supportImagePreview, null, () => {});
    await customerFetch(conversation.id, { markRead: true, force: true });
    if (el.supportComposeMessage) el.supportComposeMessage.textContent = "";
  } catch (error) {
    if (el.supportComposeMessage) el.supportComposeMessage.textContent = error.message;
  } finally {
    if (el.supportSendButton) el.supportSendButton.disabled = false;
  }
}

async function toggleCustomerConversation() {
  const conversation = customerState.conversation;
  if (!conversation) return;
  const action = conversation.status === "closed" ? "reopenConversation" : "closeConversation";
  try {
    await authApi.apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ action, conversationId: conversation.id }) });
    await customerFetch(conversation.id, { force: true });
  } catch (error) {
    showToast(error.message);
  }
}

function customerTyping() {
  if (!customerState.conversation || !authApi) return;
  authApi.apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId: customerState.conversation.id, typing: true }) }).catch(() => {});
  window.clearTimeout(customerTypingTimer);
  customerTypingTimer = window.setTimeout(() => {
    authApi.apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId: customerState.conversation.id, typing: false }) }).catch(() => {});
  }, 3000);
}

function filteredAdminConversations() {
  const query = (el.adminChatSearch?.value || "").trim().toLowerCase();
  const filter = el.adminChatFilter?.value || "all";
  return adminState.conversations.filter(conversation => {
    if (filter === "unread" && !conversation.unreadAdmin) return false;
    if (["open", "closed", "archived"].includes(filter) && conversation.status !== filter) return false;
    if (filter === "blocked" && !conversation.blocked) return false;
    if (!query) return true;
    return [conversation.customerName, conversation.customerEmail, conversation.robloxUsername, conversation.discordUsername, conversation.orderCode, conversation.lastMessage]
      .some(value => String(value || "").toLowerCase().includes(query));
  });
}

function renderAdminList() {
  if (!el.adminChatList) return;
  const list = filteredAdminConversations();
  if (!list.length) {
    el.adminChatList.innerHTML = `<div class="dashboard-empty"><strong>No matching conversations.</strong><span>Try another filter or search.</span></div>`;
    return;
  }
  el.adminChatList.innerHTML = list.map(conversation => `
    <button type="button" class="support-admin-row ${conversation.id === adminState.conversation?.id ? "selected" : ""} ${conversation.unreadAdmin ? "unread" : ""}" data-admin-conversation="${escapeHtml(conversation.id)}">
      <span class="support-customer-avatar">${escapeHtml((conversation.customerName || conversation.customerEmail || "C").slice(0, 2).toUpperCase())}</span>
      <span class="support-admin-row-copy"><strong>${escapeHtml(conversation.customerName || displayIdentity(conversation.customerEmail))}${conversation.unreadAdmin ? `<b>${conversation.unreadAdmin}</b>` : ""}</strong><small>${escapeHtml(conversation.orderCode || conversation.robloxUsername || conversation.discordUsername || displayIdentity(conversation.customerEmail))}</small><p>${escapeHtml(conversation.lastMessage || "Image attachment")}</p></span>
      <time>${escapeHtml(formatDate(conversation.lastMessageAt, true))}</time>
    </button>
  `).join("");
  el.adminChatList.querySelectorAll("[data-admin-conversation]").forEach(button => button.addEventListener("click", () => selectAdminConversation(button.dataset.adminConversation)));
}

function renderAdminSettings() {
  const settings = adminState.settings || {};
  if (el.adminSupportStatus) el.adminSupportStatus.value = settings.status || "offline";
  if (el.adminSupportDisplayName) el.adminSupportDisplayName.value = settings.displayName || "Zone6ix Support";
  if (el.adminSupportReplyText) el.adminSupportReplyText.value = settings.replyText || "Usually replies as soon as possible";
}

function renderAdminConversation() {
  renderAdminList();
  renderAdminSettings();
  updateBadges();
  const conversation = adminState.conversation;
  if (!conversation) {
    if (el.adminChatEmpty) el.adminChatEmpty.hidden = false;
    if (el.adminChatConversation) el.adminChatConversation.hidden = true;
    return;
  }
  if (el.adminChatEmpty) el.adminChatEmpty.hidden = true;
  if (el.adminChatConversation) el.adminChatConversation.hidden = false;
  if (el.adminChatConversationHead) {
    el.adminChatConversationHead.innerHTML = `<div><span class="support-customer-avatar large">${escapeHtml((conversation.customerName || "C").slice(0, 2).toUpperCase())}</span><div><small>${escapeHtml(conversationLabel(conversation))}</small><h3>${escapeHtml(conversation.customerName || "Zone6ix customer")}</h3></div></div><div><span class="support-state status-${escapeHtml(conversation.status)}">${escapeHtml(conversation.status)}</span>${conversation.blocked ? `<span class="support-state blocked">Blocked</span>` : ""}</div>`;
  }
  renderMessages(el.adminChatMessages, adminState.messages, "admin");
  if (el.supportCustomerTyping) el.supportCustomerTyping.hidden = !adminState.customerTyping;
  if (el.adminChatCustomerDetails) {
    el.adminChatCustomerDetails.innerHTML = `<h4>Customer details</h4>
      <dl><div><dt>Email</dt><dd>${escapeHtml(displayIdentity(conversation.customerEmail))}</dd></div><div><dt>Roblox</dt><dd>${escapeHtml(conversation.robloxUsername || "Not saved")}</dd></div><div><dt>Discord</dt><dd>${escapeHtml(conversation.discordUsername || "Not saved")}</dd></div><div><dt>Started</dt><dd>${escapeHtml(formatDate(conversation.createdAt))}</dd></div></dl>`;
  }
  if (el.adminChatOrderSelect) {
    el.adminChatOrderSelect.innerHTML = `<option value="">No linked order</option>${adminState.customerOrders.map(order => `<option value="${escapeHtml(order.id)}" ${order.id === conversation.orderId ? "selected" : ""}>${escapeHtml(order.order_code)} · ${escapeHtml(String(order.order_status || "").replaceAll("_", " "))}</option>`).join("")}`;
  }
  if (el.adminChatInternalNote) el.adminChatInternalNote.value = conversation.internalNote || "";
  if (el.adminChatStatus) el.adminChatStatus.value = conversation.status || "open";
  if (el.adminChatBlocked) el.adminChatBlocked.checked = Boolean(conversation.blocked);
  const canManage = Boolean(permissions.manageChat);
  [el.adminSupportMessage, el.adminSupportImageInput, el.saveAdminConversation].forEach(node => { if (node) node.disabled = !canManage; });
}

async function adminFetch(conversationId = adminState.conversation?.id || "", { markRead = false, force = false } = {}) {
  if (!authApi || !permissions.viewChat) return;
  const query = new URLSearchParams();
  if (conversationId) query.set("conversationId", conversationId);
  if (markRead) query.set("markRead", "1");
  const data = await authApi.apiFetch(`/api/admin-chat?${query.toString()}`);
  const fingerprint = JSON.stringify({ conversations: data.conversations, conversation: data.conversation, messages: data.messages, settings: data.settings, typing: data.customerTyping });
  if (!force && fingerprint === adminState.fingerprint) return;
  adminState = {
    ...adminState,
    conversations: data.conversations || [],
    conversation: data.conversation || null,
    messages: data.messages || [],
    settings: data.settings || adminState.settings,
    customerOrders: data.customerOrders || [],
    customerTyping: Boolean(data.customerTyping),
    fingerprint
  };
  renderAdminConversation();
}

async function selectAdminConversation(id) {
  await adminFetch(id, { markRead: true, force: true }).catch(error => showToast(error.message));
}

async function saveAdminSettings() {
  if (!permissions.manageChat) return;
  if (el.saveSupportSettings) el.saveSupportSettings.disabled = true;
  if (el.supportSettingsMessage) el.supportSettingsMessage.textContent = "Publishing…";
  try {
    const data = await authApi.apiFetch("/api/admin-chat", {
      method: "POST",
      body: JSON.stringify({ action: "saveSettings", settings: {
        status: el.adminSupportStatus?.value || "offline",
        displayName: el.adminSupportDisplayName?.value.trim() || "Zone6ix Support",
        replyText: el.adminSupportReplyText?.value.trim() || "Usually replies as soon as possible"
      } })
    });
    adminState.settings = data.settings;
    customerState.settings = data.settings;
    renderAdminSettings();
    setSupportPresence(data.settings);
    if (el.supportSettingsMessage) el.supportSettingsMessage.textContent = "Published live.";
  } catch (error) {
    if (el.supportSettingsMessage) el.supportSettingsMessage.textContent = error.message;
  } finally {
    if (el.saveSupportSettings) el.saveSupportSettings.disabled = false;
  }
}

async function sendAdminMessage(event) {
  event.preventDefault();
  const conversation = adminState.conversation;
  if (!conversation || !permissions.manageChat) return;
  const message = el.adminSupportMessage?.value.trim() || "";
  if (!message && !adminState.image) return;
  if (el.adminSupportComposeMessage) el.adminSupportComposeMessage.textContent = "Sending…";
  try {
    await authApi.apiFetch("/api/admin-chat", {
      method: "POST",
      body: JSON.stringify({ action: "sendMessage", conversationId: conversation.id, message, imageData: adminState.image?.data || "", imageName: adminState.image?.name || "" })
    });
    if (el.adminSupportMessage) el.adminSupportMessage.value = "";
    adminState.image = null;
    renderImagePreview(el.adminSupportImagePreview, null, () => {});
    await adminFetch(conversation.id, { markRead: true, force: true });
    if (el.adminSupportComposeMessage) el.adminSupportComposeMessage.textContent = "";
  } catch (error) {
    if (el.adminSupportComposeMessage) el.adminSupportComposeMessage.textContent = error.message;
  }
}

async function saveAdminConversation() {
  const conversation = adminState.conversation;
  if (!conversation || !permissions.manageChat) return;
  if (el.saveAdminConversation) el.saveAdminConversation.disabled = true;
  if (el.adminConversationMessage) el.adminConversationMessage.textContent = "Saving…";
  try {
    await authApi.apiFetch("/api/admin-chat", {
      method: "POST",
      body: JSON.stringify({
        action: "updateConversation",
        conversationId: conversation.id,
        status: el.adminChatStatus?.value || "open",
        blocked: Boolean(el.adminChatBlocked?.checked),
        internalNote: el.adminChatInternalNote?.value.trim() || "",
        orderId: el.adminChatOrderSelect?.value || ""
      })
    });
    await adminFetch(conversation.id, { force: true });
    if (el.adminConversationMessage) el.adminConversationMessage.textContent = "Saved.";
  } catch (error) {
    if (el.adminConversationMessage) el.adminConversationMessage.textContent = error.message;
  } finally {
    if (el.saveAdminConversation) el.saveAdminConversation.disabled = false;
  }
}

function adminTyping() {
  if (!adminState.conversation || !permissions.manageChat) return;
  authApi.apiFetch("/api/admin-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId: adminState.conversation.id, typing: true }) }).catch(() => {});
  window.clearTimeout(adminTypingTimer);
  adminTypingTimer = window.setTimeout(() => {
    authApi.apiFetch("/api/admin-chat", { method: "POST", body: JSON.stringify({ action: "typing", conversationId: adminState.conversation.id, typing: false }) }).catch(() => {});
  }, 3000);
}

function bind() {
  el.supportChatLauncher?.addEventListener("click", () => el.supportChatPanel?.classList.contains("open") ? closeSupport() : openSupport());
  el.supportMenuButton?.addEventListener("click", () => { authApi?.closeAccountMenu?.(); openSupport(); });
  el.supportMinimise?.addEventListener("click", closeSupport);
  el.supportSignIn?.addEventListener("click", () => authApi?.signIn());
  el.supportStartConversation?.addEventListener("click", createCustomerConversation);
  el.supportNewConversation?.addEventListener("click", () => { customerState.conversation = null; renderCustomer(); });
  el.supportConversationSelect?.addEventListener("change", () => customerFetch(el.supportConversationSelect.value, { markRead: true, force: true }).catch(error => showToast(error.message)));
  el.supportComposeForm?.addEventListener("submit", sendCustomerMessage);
  el.supportConversationToggle?.addEventListener("click", toggleCustomerConversation);
  el.supportMessageInput?.addEventListener("input", customerTyping);
  el.supportMessageInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      el.supportComposeForm?.requestSubmit();
    }
  });
  el.supportImageInput?.addEventListener("change", async () => {
    try {
      customerState.image = await compressImage(el.supportImageInput.files?.[0]);
      renderImagePreview(el.supportImagePreview, customerState.image, () => {
        customerState.image = null;
        el.supportImageInput.value = "";
        renderImagePreview(el.supportImagePreview, null, () => {});
      });
    } catch (error) {
      showToast(error.message);
      el.supportImageInput.value = "";
    }
  });

  el.adminChatSearch?.addEventListener("input", renderAdminList);
  el.adminChatFilter?.addEventListener("change", renderAdminList);
  el.refreshAdminChat?.addEventListener("click", () => adminFetch(adminState.conversation?.id || "", { markRead: Boolean(adminState.conversation), force: true }).catch(error => showToast(error.message)));
  el.saveSupportSettings?.addEventListener("click", saveAdminSettings);
  el.adminSupportCompose?.addEventListener("submit", sendAdminMessage);
  el.adminSupportMessage?.addEventListener("input", adminTyping);
  el.adminSupportMessage?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      el.adminSupportCompose?.requestSubmit();
    }
  });
  el.adminSupportImageInput?.addEventListener("change", async () => {
    try {
      adminState.image = await compressImage(el.adminSupportImageInput.files?.[0]);
      renderImagePreview(el.adminSupportImagePreview, adminState.image, () => {
        adminState.image = null;
        el.adminSupportImageInput.value = "";
        renderImagePreview(el.adminSupportImagePreview, null, () => {});
      });
    } catch (error) {
      showToast(error.message);
      el.adminSupportImageInput.value = "";
    }
  });
  el.saveAdminConversation?.addEventListener("click", saveAdminConversation);
  el.supportQuickReplies?.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    if (!el.adminSupportMessage) return;
    el.adminSupportMessage.value = button.textContent.trim();
    el.adminSupportMessage.focus();
    adminTyping();
  }));
  el.adminChatTab?.addEventListener("click", () => adminFetch(adminState.conversation?.id || "", { force: true }).catch(error => showToast(error.message)));
  document.addEventListener("zone6ix-dashboards-closed", () => {
    if (el.supportChatPanel?.classList.contains("open")) return;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && el.supportChatPanel?.classList.contains("open")) closeSupport();
  });
}

function restartPolling() {
  window.clearInterval(customerPoll);
  window.clearInterval(adminPoll);
  if (user) {
    customerPoll = window.setInterval(() => {
      if (document.hidden) return;
      const id = customerState.conversation?.id || customerState.conversations[0]?.id || "";
      customerFetch(id, { markRead: Boolean(el.supportChatPanel?.classList.contains("open") && id) }).catch(() => {});
    }, 3500);
  }
  if (permissions.viewChat) {
    adminPoll = window.setInterval(() => {
      if (document.hidden) return;
      const active = document.querySelector('[data-admin-panel="chat"]')?.classList.contains("active");
      adminFetch(active ? (adminState.conversation?.id || "") : "", { markRead: Boolean(active && adminState.conversation), force: false }).catch(() => {});
    }, 3500);
  }
}

async function handleAuth(detail = {}) {
  user = detail.user || authApi?.getUser?.() || null;
  permissions = detail.permissions || authApi?.getPermissions?.() || {};
  customerState = { ...customerState, conversations: [], conversation: null, messages: [], orders: [], fingerprint: "" };
  adminState = { ...adminState, conversations: [], conversation: null, messages: [], customerOrders: [], fingerprint: "" };
  renderCustomer();
  if (user) {
    await customerFetch("", { force: true }).catch(error => console.error("Chat load failed:", error));
    if (customerState.conversations.length) await customerFetch(customerState.conversations[0].id, { force: true }).catch(() => {});
  }
  if (permissions.viewChat) await adminFetch("", { force: true }).catch(() => {});
  restartPolling();
}

function initialise() {
  authApi = window.zone6ixAuth;
  if (!authApi) return false;
  bind();
  authApi.ready.then(() => handleAuth({ user: authApi.getUser(), permissions: authApi.getPermissions() }));
  document.addEventListener("zone6ix-auth-change", event => handleAuth(event.detail || {}));
  renderCustomer();
  return true;
}

if (!initialise()) document.addEventListener("zone6ix-auth-module", initialise, { once: true });
