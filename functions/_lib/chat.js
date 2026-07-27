import { cleanText, normalizeEmail, upsertUser } from "./common.js";

let chatSchemaPromise = null;

export const DEFAULT_SUPPORT_SETTINGS = {
  status: "offline",
  replyText: "Usually replies as soon as possible",
  displayName: "Zone6ix Support"
};

export async function ensureChatSchema(db) {
  if (!chatSchemaPromise) {
    chatSchemaPromise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS support_conversations (
          id TEXT PRIMARY KEY,
          firebase_uid TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_name TEXT NOT NULL DEFAULT '',
          roblox_username TEXT NOT NULL DEFAULT '',
          discord_username TEXT NOT NULL DEFAULT '',
          order_id TEXT,
          status TEXT NOT NULL DEFAULT 'open'
            CHECK (status IN ('open', 'closed', 'archived')),
          blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0, 1)),
          assigned_admin_email TEXT,
          internal_note TEXT NOT NULL DEFAULT '',
          customer_last_read_at TEXT,
          admin_last_read_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await db.prepare(`
        CREATE INDEX IF NOT EXISTS support_conversations_customer_idx
        ON support_conversations(firebase_uid, last_message_at DESC)
      `).run();
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS support_conversations_admin_idx
        ON support_conversations(status, last_message_at DESC)
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS support_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
          sender_uid TEXT,
          sender_email TEXT,
          sender_name TEXT NOT NULL DEFAULT '',
          message TEXT NOT NULL DEFAULT '',
          image_data TEXT,
          image_name TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          read_by_customer_at TEXT,
          read_by_admin_at TEXT
        )
      `).run();
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS support_messages_conversation_idx
        ON support_messages(conversation_id, created_at ASC)
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS support_typing (
          conversation_id TEXT NOT NULL,
          actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'admin')),
          actor_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          PRIMARY KEY (conversation_id, actor_type)
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS support_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          status TEXT NOT NULL DEFAULT 'offline'
            CHECK (status IN ('online', 'away', 'offline')),
          reply_text TEXT NOT NULL DEFAULT 'Usually replies as soon as possible',
          display_name TEXT NOT NULL DEFAULT 'Zone6ix Support',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_by_email TEXT
        )
      `).run();
      await db.prepare(`
        INSERT OR IGNORE INTO support_settings (id, status, reply_text, display_name)
        VALUES (1, 'offline', 'Usually replies as soon as possible', 'Zone6ix Support')
      `).run();
    })().catch(error => {
      chatSchemaPromise = null;
      throw error;
    });
  }
  await chatSchemaPromise;
}

function boolean(value) {
  return value === true || Number(value) === 1;
}

export function cleanImageData(value) {
  const data = String(value || "");
  if (!data) return "";
  if (data.length > 480000) throw Object.assign(new Error("That image is too large after compression."), { status: 400 });
  if (!/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(data)) {
    throw Object.assign(new Error("Only compressed JPG, PNG or WebP images are supported."), { status: 400 });
  }
  return data;
}

export function sanitizeMessage(input = {}) {
  const message = cleanText(input.message, { name: "Message", max: 2500 });
  const imageData = cleanImageData(input.imageData);
  const imageName = imageData ? cleanText(input.imageName || "image", { name: "Image name", max: 120 }) : "";
  if (!message && !imageData) throw Object.assign(new Error("Write a message or attach an image."), { status: 400 });
  return { message, imageData, imageName };
}

export async function getSupportSettings(db) {
  await ensureChatSchema(db);
  const row = await db.prepare("SELECT * FROM support_settings WHERE id = 1").first();
  return {
    status: ["online", "away", "offline"].includes(row?.status) ? row.status : DEFAULT_SUPPORT_SETTINGS.status,
    replyText: row?.reply_text || DEFAULT_SUPPORT_SETTINGS.replyText,
    displayName: row?.display_name || DEFAULT_SUPPORT_SETTINGS.displayName,
    updatedAt: row?.updated_at || null
  };
}

export async function saveSupportSettings(db, input, adminEmail) {
  await ensureChatSchema(db);
  const status = ["online", "away", "offline"].includes(input?.status) ? input.status : "offline";
  const replyText = cleanText(input?.replyText, { name: "Reply time", min: 1, max: 120, required: true });
  const displayName = cleanText(input?.displayName || "Zone6ix Support", { name: "Support display name", min: 1, max: 60, required: true });
  await db.prepare(`
    UPDATE support_settings
    SET status = ?, reply_text = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP, updated_by_email = ?
    WHERE id = 1
  `).bind(status, replyText, displayName, adminEmail).run();
  return getSupportSettings(db);
}

export function mapConversation(row) {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    customerEmail: row.customer_email,
    customerName: row.customer_name || "",
    robloxUsername: row.roblox_username || "",
    discordUsername: row.discord_username || "",
    orderId: row.order_id || "",
    orderCode: row.order_code || "",
    status: row.status || "open",
    blocked: boolean(row.blocked),
    assignedAdminEmail: row.assigned_admin_email || "",
    internalNote: row.internal_note || "",
    customerLastReadAt: row.customer_last_read_at || null,
    adminLastReadAt: row.admin_last_read_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message || "",
    lastSenderType: row.last_sender_type || "",
    unreadCustomer: Number(row.unread_customer || 0),
    unreadAdmin: Number(row.unread_admin || 0)
  };
}

export function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderName: row.sender_name || (row.sender_type === "admin" ? "Zone6ix Support" : "Customer"),
    message: row.message || "",
    imageData: row.image_data || "",
    imageName: row.image_name || "",
    createdAt: row.created_at,
    readByCustomerAt: row.read_by_customer_at || null,
    readByAdminAt: row.read_by_admin_at || null
  };
}

export async function listCustomerConversations(db, user) {
  await ensureChatSchema(db);
  const result = await db.prepare(`
    SELECT c.*,
      o.order_code,
      (SELECT message FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT sender_type FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_type,
      (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.read_by_customer_at IS NULL) AS unread_customer,
      0 AS unread_admin
    FROM support_conversations c
    LEFT JOIN orders o ON o.id = c.order_id
    WHERE c.firebase_uid = ?
    ORDER BY c.last_message_at DESC
  `).bind(user.uid).all();
  return (result.results || []).map(mapConversation);
}

export async function listAdminConversations(db) {
  await ensureChatSchema(db);
  const result = await db.prepare(`
    SELECT c.*,
      o.order_code,
      (SELECT message FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT sender_type FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_type,
      0 AS unread_customer,
      (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'customer' AND m.read_by_admin_at IS NULL) AS unread_admin
    FROM support_conversations c
    LEFT JOIN orders o ON o.id = c.order_id
    ORDER BY c.last_message_at DESC
    LIMIT 500
  `).all();
  return (result.results || []).map(mapConversation);
}

export async function getConversation(db, conversationId) {
  await ensureChatSchema(db);
  const row = await db.prepare(`
    SELECT c.*, o.order_code,
      (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.read_by_customer_at IS NULL) AS unread_customer,
      (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'customer' AND m.read_by_admin_at IS NULL) AS unread_admin
    FROM support_conversations c
    LEFT JOIN orders o ON o.id = c.order_id
    WHERE c.id = ? LIMIT 1
  `).bind(conversationId).first();
  return row ? mapConversation(row) : null;
}

export async function getMessages(db, conversationId, limit = 200) {
  await ensureChatSchema(db);
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 200));
  const result = await db.prepare(`
    SELECT * FROM (
      SELECT * FROM support_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?
    ) ORDER BY created_at ASC
  `).bind(conversationId, safeLimit).all();
  return (result.results || []).map(mapMessage);
}

export async function validateCustomerOrder(db, user, orderId) {
  if (!orderId) return "";
  const row = await db.prepare("SELECT id FROM orders WHERE id = ? AND firebase_uid = ? LIMIT 1").bind(orderId, user.uid).first();
  if (!row) throw Object.assign(new Error("That order does not belong to your account."), { status: 403 });
  return row.id;
}

export async function createConversation(db, user, input = {}) {
  await ensureChatSchema(db);
  await upsertUser(db, user, {});
  const orderId = await validateCustomerOrder(db, user, input.orderId);
  const profile = await db.prepare(`
    SELECT display_name, roblox_username, discord_username FROM users WHERE firebase_uid = ? LIMIT 1
  `).bind(user.uid).first();

  const blocked = await db.prepare(`
    SELECT id FROM support_conversations WHERE firebase_uid = ? AND blocked = 1 LIMIT 1
  `).bind(user.uid).first();
  if (blocked?.id) {
    throw Object.assign(new Error("Live chat is unavailable for this account."), { status: 403 });
  }

  const recent = await db.prepare(`
    SELECT COUNT(*) AS total FROM support_conversations
    WHERE firebase_uid = ? AND created_at >= datetime('now', '-1 hour')
  `).bind(user.uid).first();
  if (Number(recent?.total || 0) >= 5) {
    throw Object.assign(new Error("Too many conversations were started recently. Please use an existing conversation or try again later."), { status: 429 });
  }

  const existing = await db.prepare(`
    SELECT id FROM support_conversations
    WHERE firebase_uid = ? AND status = 'open' AND blocked = 0
      AND COALESCE(order_id, '') = COALESCE(?, '')
    ORDER BY last_message_at DESC LIMIT 1
  `).bind(user.uid, orderId || null).first();
  if (existing?.id) return getConversation(db, existing.id);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO support_conversations (
      id, firebase_uid, customer_email, customer_name, roblox_username, discord_username,
      order_id, status, blocked, created_at, updated_at, last_message_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    user.uid,
    normalizeEmail(user.email),
    profile?.display_name || user.displayName || "Zone6ix customer",
    profile?.roblox_username || "",
    profile?.discord_username || "",
    orderId || null
  ).run();
  return getConversation(db, id);
}

export async function assertCustomerConversation(db, user, conversationId) {
  const conversation = await getConversation(db, conversationId);
  if (!conversation || conversation.firebaseUid !== user.uid) {
    throw Object.assign(new Error("Conversation not found."), { status: 404 });
  }
  return conversation;
}

export async function enforceMessageRateLimit(db, conversationId, senderType) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS total FROM support_messages
    WHERE conversation_id = ? AND sender_type = ? AND created_at >= datetime('now', '-60 seconds')
  `).bind(conversationId, senderType).first();
  if (Number(row?.total || 0) >= 10) {
    throw Object.assign(new Error("You are sending messages too quickly. Wait a moment and try again."), { status: 429 });
  }
}

export async function insertMessage(db, conversation, sender, senderType, input) {
  const clean = sanitizeMessage(input);
  await enforceMessageRateLimit(db, conversation.id, senderType);
  const id = crypto.randomUUID();
  const senderName = senderType === "admin"
    ? cleanText(input.senderName || "Zone6ix Support", { name: "Sender name", min: 1, max: 60, required: true })
    : (sender.displayName || conversation.customerName || "Customer");

  await db.prepare(`
    INSERT INTO support_messages (
      id, conversation_id, sender_type, sender_uid, sender_email, sender_name,
      message, image_data, image_name, created_at, read_by_customer_at, read_by_admin_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
  `).bind(
    id,
    conversation.id,
    senderType,
    sender?.uid || null,
    normalizeEmail(sender?.email),
    senderName,
    clean.message,
    clean.imageData || null,
    clean.imageName || null,
    senderType === "customer" ? new Date().toISOString() : null,
    senderType === "admin" ? new Date().toISOString() : null
  ).run();

  await db.prepare(`
    UPDATE support_conversations
    SET status = 'open', updated_at = CURRENT_TIMESTAMP, last_message_at = CURRENT_TIMESTAMP,
        ${senderType === "customer" ? "customer_last_read_at" : "admin_last_read_at"} = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(conversation.id).run();
  return mapMessage(await db.prepare("SELECT * FROM support_messages WHERE id = ?").bind(id).first());
}

export async function markConversationRead(db, conversationId, actorType) {
  const column = actorType === "admin" ? "read_by_admin_at" : "read_by_customer_at";
  const sender = actorType === "admin" ? "customer" : "admin";
  await db.prepare(`
    UPDATE support_messages SET ${column} = COALESCE(${column}, CURRENT_TIMESTAMP)
    WHERE conversation_id = ? AND sender_type = ?
  `).bind(conversationId, sender).run();
  const conversationColumn = actorType === "admin" ? "admin_last_read_at" : "customer_last_read_at";
  await db.prepare(`UPDATE support_conversations SET ${conversationColumn} = CURRENT_TIMESTAMP WHERE id = ?`).bind(conversationId).run();
}

export async function setTyping(db, conversationId, actorType, actorId, typing) {
  await ensureChatSchema(db);
  if (!typing) {
    await db.prepare("DELETE FROM support_typing WHERE conversation_id = ? AND actor_type = ?").bind(conversationId, actorType).run();
    return;
  }
  await db.prepare(`
    INSERT INTO support_typing (conversation_id, actor_type, actor_id, expires_at)
    VALUES (?, ?, ?, datetime('now', '+8 seconds'))
    ON CONFLICT(conversation_id, actor_type) DO UPDATE SET actor_id = excluded.actor_id, expires_at = excluded.expires_at
  `).bind(conversationId, actorType, actorId).run();
}

export async function getTyping(db, conversationId, otherActorType) {
  await ensureChatSchema(db);
  const row = await db.prepare(`
    SELECT actor_type FROM support_typing
    WHERE conversation_id = ? AND actor_type = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1
  `).bind(conversationId, otherActorType).first();
  return Boolean(row);
}
