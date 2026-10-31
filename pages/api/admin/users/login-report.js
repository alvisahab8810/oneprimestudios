// pages/api/admin/users/login-report.js
// Every OPS sign-in and sign-out in one list, for the Excel export on the
// OPS Users screen. ActivityLog keeps 180 days, so that is the furthest back
// any report can reach.
import dbConnect from "@/lib/dbConnect";
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

  try {
    const { from = "", to = "", search = "", role = "" } = req.query;

    // The same search and role filters the table itself uses, so the sheet
    // matches what the admin is looking at
    const userFilter = {};
    if (role) userFilter.role = role;
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await Admin.find(userFilter, {
      name: 1,
      email: 1,
      role: 1,
      isActive: 1,
      permissions: 1,
      lastLoginAt: 1,
      loginCount: 1,
      createdAt: 1,
    })
      .sort({ name: 1 })
      .lean();

    const byId = new Map(users.map((u) => [String(u._id), u]));

    const logFilter = {
      adminId: { $in: users.map((u) => u._id) },
      action: { $in: ["admin_login", "admin_logout"] },
    };

    // "to" is read as the whole of that day, which is what a person picking a
    // date on a report means
    const range = {};
    if (from) {
      const start = new Date(from);
      if (!Number.isNaN(start.getTime())) range.$gte = start;
    }
    if (to) {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
    }
    if (range.$gte || range.$lte) logFilter.createdAt = range;

    const logs = await ActivityLog.find(logFilter, {
      adminId: 1,
      action: 1,
      createdAt: 1,
      meta: 1,
    })
      .sort({ createdAt: -1 })
      .limit(20000)
      .lean();

    return res.json({
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: !!u.isActive,
        permissions: u.permissions || [],
        lastLoginAt: u.lastLoginAt || null,
        loginCount: u.loginCount || 0,
        createdAt: u.createdAt || null,
      })),
      events: logs.map((l) => {
        const user = byId.get(String(l.adminId));
        return {
          _id: l._id,
          name: user?.name || "Unknown",
          email: user?.email || "",
          role: user?.role || "",
          type: l.action === "admin_logout" ? "logout" : "login",
          at: l.createdAt,
          ip: l.meta?.ip || "",
          userAgent: l.meta?.userAgent || "",
        };
      }),
    });
  } catch (err) {
    console.error("Login report error:", err);
    return res.status(500).json({ message: "Could not build the login report" });
  }
}
