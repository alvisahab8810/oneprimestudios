import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import ActivityLog from "@/models/ActivityLog";
import { verifyJWT } from "@/lib/verifyJWT";

/**
 * Non-blocking activity logger. Call after sending the response.
 * @param {object} req        - Next.js API request (used to extract admin from cookie)
 * @param {string} action     - snake_case action key e.g. "order_status_updated"
 * @param {string} description - Human-readable sentence e.g. "Order #123 status changed to Dispatched"
 * @param {object} [opts]     - { entity, entityId, meta, adminId, adminName, adminEmail }
 */
export async function logActivity(req, action, description, opts = {}) {
  try {
    await dbConnect();

    let adminId    = opts.adminId    || null;
    let adminName  = opts.adminName  || "Unknown";
    let adminEmail = opts.adminEmail || "";

    // Try to resolve admin from cookie if not provided
    if (!adminId && req?.cookies?.admin_auth) {
      const decoded = verifyJWT(req.cookies.admin_auth);
      if (decoded?.id) {
        const admin = await Admin.findById(decoded.id, { name: 1, email: 1 }).lean();
        if (admin) {
          adminId    = admin._id;
          adminName  = admin.name;
          adminEmail = admin.email;
        }
      }
    }

    await ActivityLog.create({
      adminId,
      adminName,
      adminEmail,
      action,
      entity:      opts.entity   || "",
      entityId:    opts.entityId ? String(opts.entityId) : "",
      description,
      meta:        opts.meta     || {},
    });
  } catch (err) {
    // Never let logging crash the main request
    console.error("logActivity error:", err.message);
  }
}
