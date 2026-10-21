// pages/api/admin/users/[id]/logins.js
// Login history for one OPS staff account, read by the super admin from the
// OPS Users screen. Rows come from ActivityLog, which keeps 180 days.
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import Admin from "@/models/Admin";
import ActivityLog from "@/models/ActivityLog";
import { requireSuperAdmin } from "@/lib/adminAuth";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const me = await requireSuperAdmin(req, res);
  if (!me) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    const user = await Admin.findById(id, {
      name: 1,
      email: 1,
      role: 1,
      lastLoginAt: 1,
      lastLoginIp: 1,
      loginCount: 1,
    }).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const logs = await ActivityLog.find(
      { adminId: user._id, action: { $in: ["admin_login", "admin_logout"] } },
      { action: 1, createdAt: 1, meta: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || "",
        loginCount: user.loginCount || 0,
      },
      logins: logs.map((l) => ({
        _id: l._id,
        type: l.action === "admin_logout" ? "logout" : "login",
        at: l.createdAt,
        ip: l.meta?.ip || "",
        userAgent: l.meta?.userAgent || "",
      })),
    });
  } catch (err) {
    console.error("Login history error:", err);
    return res.status(500).json({ message: "Could not load login history" });
  }
}
