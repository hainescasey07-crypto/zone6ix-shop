import { json, requireFirebaseUser, upsertUser } from "../_lib/common.js";
import {
  assertCustomerConversation,
  createConversation,
  deleteConversation,
  ensureChatSchema,
  getConversation,
  getMessages,
  getSupportSettings,
  getTyping,
  insertMessage,
  listCustomerConversations,
  markConversationRead,
  setTyping
} from "../_lib/chat.js";

async function customerOrders(db, user) {
  const result = await db.prepare(`
    SELECT id, order_code, order_status, created_at
    FROM orders WHERE firebase_uid = ?
    ORDER BY created_at DESC LIMIT 100
  `).bind(user.uid).all();
  return result.results || [];
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    await ensureChatSchema(env.DB);
    await upsertUser(env.DB, user, {});
    const url = new URL(request.url);
    const conversationId = String(url.searchParams.get("conversationId") || "").trim();
    let conversations = await listCustomerConversations(env.DB, user);
    let conversation = null;
    let messages = [];
    let adminTyping = false;

    if (conversationId) {
      conversation = await getConversation(env.DB, conversationId);
      if (conversation && conversation.firebaseUid !== user.uid) {
        throw Object.assign(new Error("Conversation not found."), { status: 404 });
      }
      if (!conversation && conversations[0]?.id) {
        conversation = await assertCustomerConversation(env.DB, user, conversations[0].id);
      }
      if (conversation && url.searchParams.get("markRead") === "1") {
        await markConversationRead(env.DB, conversation.id, "customer");
        conversation = await getConversation(env.DB, conversation.id);
        conversations = await listCustomerConversations(env.DB, user);
      }
      if (conversation) {
        messages = await getMessages(env.DB, conversation.id);
        adminTyping = await getTyping(env.DB, conversation.id, "admin");
      }
    }

    return json({
      settings: await getSupportSettings(env.DB),
      conversations,
      conversation,
      messages,
      adminTyping,
      orders: await customerOrders(env.DB, user)
    });
  } catch (error) {
    return json({ error: error.message || "Could not load live chat." }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    await ensureChatSchema(env.DB);
    const input = await request.json().catch(() => ({}));
    const action = String(input.action || "");

    if (action === "createConversation") {
      const conversation = await createConversation(env.DB, user, { orderId: input.orderId || "" });
      return json({ conversation }, 201);
    }

    const conversationId = String(input.conversationId || "").trim();
    if (!conversationId) throw Object.assign(new Error("Conversation is required."), { status: 400 });
    const conversation = await assertCustomerConversation(env.DB, user, conversationId);

    if (action === "sendMessage") {
      if (conversation.blocked) throw Object.assign(new Error("Messaging is unavailable for this conversation."), { status: 403 });
      if (conversation.status === "closed") throw Object.assign(new Error("This conversation is permanently closed."), { status: 400 });
      if (conversation.status === "archived") throw Object.assign(new Error("This conversation is archived."), { status: 400 });
      const message = await insertMessage(env.DB, conversation, user, "customer", input);
      await setTyping(env.DB, conversationId, "customer", user.uid, false);
      return json({ message, conversation: await getConversation(env.DB, conversationId) }, 201);
    }

    if (action === "typing") {
      if (!conversation.blocked && conversation.status === "open") {
        await setTyping(env.DB, conversationId, "customer", user.uid, Boolean(input.typing));
      }
      return json({ ok: true });
    }

    if (action === "markRead") {
      await markConversationRead(env.DB, conversationId, "customer");
      return json({ ok: true });
    }

    if (action === "closeConversation") {
      if (conversation.status === "archived") throw Object.assign(new Error("This conversation is archived."), { status: 400 });
      await env.DB.prepare(`
        UPDATE support_conversations SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND firebase_uid = ?
      `).bind(conversationId, user.uid).run();
      return json({ conversation: await getConversation(env.DB, conversationId) });
    }

    if (action === "reopenConversation") {
      throw Object.assign(new Error("Closed conversations cannot be reopened. Start a new chat instead."), { status: 400 });
    }

    if (action === "deleteConversation") {
      if (conversation.blocked) throw Object.assign(new Error("A blocked conversation can only be deleted by support."), { status: 403 });
      await deleteConversation(env.DB, conversationId);
      return json({ deleted: true, conversationId });
    }

    throw Object.assign(new Error("Unknown chat action."), { status: 400 });
  } catch (error) {
    return json({ error: error.message || "Live chat action failed." }, error.status || 500);
  }
}
