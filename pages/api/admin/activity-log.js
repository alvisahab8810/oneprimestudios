import dbConnect from "@/lib/dbConnect";
import ActivityLog from "@/models/ActivityLog";
import { verifyJWT } from "@/lib/verifyJWT";
import Admin from "@/models/Admin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const token = req.cookies.admin_auth;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const decoded = verifyJWT(token);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });

  const admin = await Admin.findById(decoded.id, { role: 1 }).lean();
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  const { dateFrom, dateTo, action, adminId, orderId, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (action) filter.action = action;
  if (adminId) filter.adminId = adminId;

  if (orderId) {
    const escaped = orderId.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { description: regex },
      { entityId: regex },
      { "meta.orderNumber": regex },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await ActivityLog.countDocuments(filter);
  const logs  = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  return res.json({ logs, total, page: Number(page), limit: Number(limit) });
}
