import { json, requirePermission } from "../_lib/common.js";
import { logAdminAction } from "../_lib/site.js";
import {
  deleteConversation,
  ensureChatSchema,
  getConversation,
  getMessages,
  getSupportSettings,
  getTyping,
  insertMessage,
  listAdminConversations,
  markConversationRead,
  saveSupportSettings,
  setTyping
} from "../_lib/chat.js";

export async function onRequestGet({ request, env }) {
  try {
    const admin = await requirePermission(request, env.DB, "viewChat");
    await ensureChatSchema(env.DB);
    const url = new URL(request.url);
    const conversationId = String(url.searchParams.get("conversationId") || "").trim();
    let conversations = await listAdminConversations(env.DB);
    let conversation = null;
    let messages = [];
    let customerTyping = false;
    let customerOrders = [];

    if (conversationId) {
      conversation = await getConversation(env.DB, conversationId);
      if (!conversation && conversations[0]?.id) conversation = await getConversation(env.DB, conversations[0].id);
      if (conversation && url.searchParams.get("markRead") === "1") {
        await markConversationRead(env.DB, conversation.id, "admin");
        conversation = await getConversation(env.DB, conversation.id);
        conversations = await listAdminConversations(env.DB);
      }
      if (conversation) {
        messages = await getMessages(env.DB, conversation.id);
        customerTyping = await getTyping(env.DB, conversation.id, "customer");
        const orderResult = await env.DB.prepare(`SELECT id, order_code, order_status, payment_status, created_at FROM orders WHERE firebase_uid = ? ORDER BY created_at DESC LIMIT 100`).bind(conversation.firebaseUid).all();
        customerOrders = orderResult.results || [];
      }
    }

    return json({
      admin: { role: admin.adminRole, permissions: admin.permissions },
      settings: await getSupportSettings(env.DB),
      conversations,
      conversation,
      messages,
      customerTyping,
      customerOrders
    });
  } catch (error) {
    return json({ error: error.message || "Could not load support inbox." }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const input = await request.json().catch(() => ({}));
    const action = String(input.action || "");
    const requiredPermission = action === "readOnly" ? "viewChat" : "manageChat";
    const admin = await requirePermission(request, env.DB, requiredPermission);
    await ensureChatSchema(env.DB);

    if (action === "saveSettings") {
      const settings = await saveSupportSettings(env.DB, input.settings || {}, admin.email);
      await logAdminAction(env.DB, admin, "support_settings_updated", "support", "main", {
        status: settings.status,
        replyText: settings.replyText,
        displayName: settings.displayName
      });
      return json({ settings });
    }

    const conversationId = String(input.conversationId || "").trim();
    if (!conversationId) throw Object.assign(new Error("Conversation is required."), { status: 400 });
    const conversation = await getConversation(env.DB, conversationId);
    if (!conversation) throw Object.assign(new Error("Conversation not found."), { status: 404 });

    if (action === "sendMessage") {
      if (conversation.blocked) throw Object.assign(new Error("Unblock this customer before replying."), { status: 400 });
      if (conversation.status === "closed") throw Object.assign(new Error("This conversation is permanently closed."), { status: 400 });
      if (conversation.status === "archived") throw Object.assign(new Error("Restore this conversation before replying."), { status: 400 });
      const settings = await getSupportSettings(env.DB);
      const message = await insertMessage(env.DB, conversation, admin, "admin", {
        ...input,
        senderName: settings.displayName
      });
      await setTyping(env.DB, conversationId, "admin", admin.email, false);
      return json({ message, conversation: await getConversation(env.DB, conversationId) }, 201);
    }

    if (action === "typing") {
      if (!conversation.blocked && conversation.status === "open") {
        await setTyping(env.DB, conversationId, "admin", admin.email, Boolean(input.typing));
      }
      return json({ ok: true });
    }

    if (action === "markRead") {
      await markConversationRead(env.DB, conversationId, "admin");
      return json({ ok: true });
    }

    if (action === "deleteConversation") {
      await deleteConversation(env.DB, conversationId);
      await logAdminAction(env.DB, admin, "support_conversation_deleted", "support_conversation", conversationId, {
        customerEmail: conversation.customerEmail,
        customerName: conversation.customerName,
        orderId: conversation.orderId || ""
      });
      return json({ deleted: true, conversationId });
    }

    if (action === "updateConversation") {
      const status = ["open", "closed", "archived"].includes(input.status) ? input.status : conversation.status;
      if (conversation.status === "closed" && status !== "closed") {
        throw Object.assign(new Error("Closed conversations cannot be reopened or archived. Delete it or start a new chat."), { status: 400 });
      }
      const blocked = input.blocked === true || Number(input.blocked) === 1 ? 1 : 0;
      const internalNote = String(input.internalNote || "").trim().slice(0, 5000);
      const orderId = String(input.orderId || "").trim() || null;
      if (orderId) {
        const order = await env.DB.prepare("SELECT id FROM orders WHERE id = ? AND firebase_uid = ? LIMIT 1").bind(orderId, conversation.firebaseUid).first();
        if (!order) throw Object.assign(new Error("That order does not belong to this customer."), { status: 400 });
      }
      if (blocked) {
        await env.DB.prepare(`
          UPDATE support_conversations SET blocked = 1, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = ?
        `).bind(conversation.firebaseUid).run();
      } else if (conversation.blocked) {
        await env.DB.prepare(`
          UPDATE support_conversations SET blocked = 0, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = ?
        `).bind(conversation.firebaseUid).run();
      }
      await env.DB.prepare(`
        UPDATE support_conversations
        SET status = ?, blocked = ?, internal_note = ?, order_id = ?, assigned_admin_email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(status, blocked, internalNote, orderId, admin.email, conversationId).run();
      await logAdminAction(env.DB, admin, "support_conversation_updated", "support_conversation", conversationId, {
        status, blocked: Boolean(blocked), orderId: orderId || ""
      });
      return json({ conversation: await getConversation(env.DB, conversationId) });
    }

    throw Object.assign(new Error("Unknown support action."), { status: 400 });
  } catch (error) {
    return json({ error: error.message || "Support action failed." }, error.status || 500);
  }
}
