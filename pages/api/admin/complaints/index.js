// pages/api/admin/complaints/index.js  — GET all complaints
// pages/api/admin/complaints/[id].js  — PUT update status + reply
// Put both in one file for now, route by method + query

// pages/api/admin/complaints/index.js
import dbConnect from "@/lib/dbConnect";
import Complaint from "@/models/Complaint";
import Admin from "@/models/Admin";
import User from "@/models/User";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";

// A typed search term is used as a regular expression, so anything in it that
// has a meaning there is escaped first
const escapeForSearch = (term) =>
  String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAdmin = async (req) => {
  const token = req.cookies.admin_auth;
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  const admin = await Admin.findById(decoded.id, { role: 1, permissions: 1 });
  if (!admin) return null;
  return { id: admin._id, role: admin.role, permissions: admin.permissions || [] };
};

export default async function handler(req, res) {
  await dbConnect();
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  // ── GET: list all complaints ──────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { status, search, page = 1, limit = 15, from, to, userType } = req.query;
      const pageNum  = Math.max(1, Number(page));
      // A bigger page is allowed so the admin screen can export every match
      const limitNum = Math.min(Math.max(1, Number(limit) || 15), 5000);
      const skip     = (pageNum - 1) * limitNum;

      const filter = {};
      if (status) filter.status = status;

      // Date range on when the complaint was raised; both days are included
      const raisedOn = {};
      if (from) {
        const d = new Date(`${from}T00:00:00`);
        if (!Number.isNaN(d.getTime())) raisedOn.$gte = d;
      }
      if (to) {
        const d = new Date(`${to}T23:59:59.999`);
        if (!Number.isNaN(d.getTime())) raisedOn.$lte = d;
      }
      if (Object.keys(raisedOn).length) filter.createdAt = raisedOn;

      // The side (B2B / B2C) and the search term both live on the user, so the
      // matching users are looked up once and the complaints narrowed to them.
      // Doing it here — instead of filtering the page after it is read — keeps
      // the count, the pages and the export in agreement.
      const side =
        userType === "partner" ? "partner" : userType === "customer" ? "customer" : "";
      const term = String(search || "").trim();

      if (side) {
        const sideFilter =
          side === "partner" ? { userType: "partner" } : { userType: { $ne: "partner" } };
        const sideUsers = await User.find(sideFilter, { _id: 1 }).lean();
        filter.user = { $in: sideUsers.map((u) => u._id) };
      }

      if (term) {
        const rx = new RegExp(escapeForSearch(term), "i");
        const matchedUsers = await User.find(
          { $or: [{ name: rx }, { email: rx }, { phone: rx }, { companyName: rx }] },
          { _id: 1 }
        ).lean();

        filter.$or = [
          { complaintNumber: rx },
          { orderId: rx },
          { message: rx },
          { user: { $in: matchedUsers.map((u) => u._id) } },
        ];
      }

      const complaints = await Complaint.find(filter)
        .populate("user", "name email phone companyName userType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Complaint.countDocuments(filter);

      // Counts for the cards at the top: every other filter applies, but not
      // the status one, so the cards keep showing the full picture
      const countFilter = { ...filter };
      delete countFilter.status;
      const grouped = await Complaint.aggregate([
        { $match: countFilter },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]);

      return res.status(200).json({
        success: true,
        data: complaints,
        total,
        counts: grouped.reduce((acc, g) => ({ ...acc, [g._id]: g.n }), {}),
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
        currentPage: pageNum,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}