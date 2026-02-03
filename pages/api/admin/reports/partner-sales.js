


import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 1. Verify login
    const token = req.cookies.admin_auth;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔥 2. LOAD USER FROM DB (SOURCE OF TRUTH)
    const adminUser = await Admin.findById(decoded.id, {
      role: 1,
      permissions: 1,
    });

    if (!adminUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 👤 3. Permission engine uses DB data
    const user = {
      id: adminUser._id,
      role: adminUser.role,
      permissions: adminUser.permissions || [],
    };

    // 🔒 4. Permission check
    if (!hasPermission(user, "reports.partner_sales")) {
      return res.status(403).json({ message: "No permission" });
    }

    // 🔍 5. Business logic (UNCHANGED)
    const { from, to } = req.query;

    const partners = await User.aggregate([
      {
        $match: { userType: "partner" },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $addFields: {
          totalOrders: { $size: "$orders" },
          totalSales: { $sum: "$orders.total" },
        },
      },
      {
        $project: {
          name: 1,
          companyName: 1,
          memberId: 1,
          totalOrders: 1,
          totalSales: { $ifNull: ["$totalSales", 0] },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    return res.status(200).json({ partners });

  } catch (err) {
    console.error("Partner sales report error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
