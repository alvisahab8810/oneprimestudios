// pages/api/admin/complaints/[id].js
import dbConnect from "@/lib/dbConnect";
import Complaint from "@/models/Complaint";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";

const getAdmin = async (req) => {
  const token = req.cookies.admin_auth;
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  return await Admin.findById(decoded.id, { role: 1, permissions: 1 });
};

export default async function handler(req, res) {
  await dbConnect();
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;

  // ── GET single complaint ──────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const complaint = await Complaint.findById(id)
        .populate("user", "name email phone companyName userType")
        .lean();
      if (!complaint) return res.status(404).json({ message: "Complaint not found" });
      return res.status(200).json({ success: true, data: complaint });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── PUT: update status + admin reply ─────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const { status, adminReply } = req.body;
      const allowed = ["Pending", "Under Review", "Initiated", "Resolved"];
      if (status && !allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const update = {};
      if (status)     update.status     = status;
      if (adminReply !== undefined) update.adminReply = adminReply;

      const complaint = await Complaint.findByIdAndUpdate(id, update, { new: true })
        .populate("user", "name email phone companyName userType");

      if (!complaint) return res.status(404).json({ message: "Complaint not found" });
      return res.status(200).json({ success: true, data: complaint });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}