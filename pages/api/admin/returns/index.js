// pages/api/admin/returns/index.js — GET list of return/refund requests
import dbConnect from "@/lib/dbConnect";
import ReturnRequest from "@/models/ReturnRequest";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";
import { OPEN_RETURN_STATUSES } from "@/lib/returnRules";

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
  if (!hasPermission(admin, "orders")) {
    return res.status(403).json({ message: "No permission" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { status, search, page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status === "open") filter.status = { $in: OPEN_RETURN_STATUSES };
    else if (status) filter.status = status;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ requestNumber: regex }, { orderNumber: regex }, { reason: regex }];
    }

    const [requests, total, counts] = await Promise.all([
      ReturnRequest.find(filter)
        .populate("user", "name email phone userType companyName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReturnRequest.countDocuments(filter),
      ReturnRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const summary = counts.reduce(
      (acc, row) => {
        acc[row._id] = row.count;
        acc.total += row.count;
        if (OPEN_RETURN_STATUSES.includes(row._id)) acc.open += row.count;
        return acc;
      },
      { total: 0, open: 0 }
    );

    return res.status(200).json({
      success: true,
      data: requests,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      summary,
    });
  } catch (err) {
    console.error("Admin returns list error:", err);
    return res.status(500).json({ message: err.message });
  }
}
