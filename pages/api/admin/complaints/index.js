// pages/api/admin/complaints/index.js  — GET all complaints
// pages/api/admin/complaints/[id].js  — PUT update status + reply
// Put both in one file for now, route by method + query

// pages/api/admin/complaints/index.js
import dbConnect from "@/lib/dbConnect";
import Complaint from "@/models/Complaint";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";

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
      const { status, search, page = 1, limit = 15 } = req.query;
      const pageNum  = Math.max(1, Number(page));
      const limitNum = Number(limit);
      const skip     = (pageNum - 1) * limitNum;

      const filter = {};
      if (status) filter.status = status;

      const complaints = await Complaint.find(filter)
        .populate("user", "name email phone companyName userType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Client-side search filter on populated user name / orderId / complaintNumber
      const filtered = search
        ? complaints.filter(c =>
            c.complaintNumber?.toLowerCase().includes(search.toLowerCase()) ||
            c.orderId?.toLowerCase().includes(search.toLowerCase()) ||
            c.user?.name?.toLowerCase().includes(search.toLowerCase())
          )
        : complaints;

      const total = await Complaint.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: filtered,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}