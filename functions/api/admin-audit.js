import { errorResponse, json, requirePermission } from "../_lib/common.js";
import { ensureSiteSchema } from "../_lib/site.js";

export async function onRequestGet({ request, env }) {
  try {
    await requirePermission(request, env.DB, "viewAudit");
    await ensureSiteSchema(env.DB);
    const result = await env.DB.prepare(`
      SELECT id, admin_email, action, target_type, target_id, details_json, created_at
      FROM admin_audit_log
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 250
    `).all();
    const entries = (result.results || []).map(row => {
      let details = {};
      try { details = JSON.parse(row.details_json || "{}"); } catch { details = {}; }
      return { ...row, details };
    });
    return json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}
