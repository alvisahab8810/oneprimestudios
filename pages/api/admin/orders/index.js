

// import Product from "@/models/Product";
// import dbConnect from "@/lib/dbConnect";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import { verifyAdmin } from "@/lib/verifyJWT";

// export default async function handler(req, res) {
//   try {
//     await dbConnect();

//     const admin = await verifyAdmin(req, res);
//     if (!admin) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const { status, userType, search, page = 1, limit = 10 } = req.query;

//     const filters = {};

//     // Status filter
//     if (status) filters.status = status;

//     // Pagination
//     const pageNum = Number(page);
//     const limitNum = Number(limit);
//     const skip = (pageNum - 1) * limitNum;

//     // ---- SEARCH LOGIC ----
//     let userIds = [];

//     if (search) {
//       const regex = new RegExp(search, "i");

//       // Search user name
//       const matchedUsers = await User.find({ name: { $regex: regex } }).select("_id");
//       userIds = matchedUsers.map((u) => u._id);

//       // Now apply OR search only once
//       filters.$or = [
//         { orderNumber: { $regex: regex } },
//         { user: { $in: userIds } }
//       ];
//     }

//     // ---- USER TYPE LOGIC ----
//     let populateMatch = {};
//     if (userType) populateMatch.userType = userType;

//     // Count matching orders
//     const totalOrders = await Order.countDocuments(filters);

//     // Fetch orders
//     const orders = await Order.find(filters)
//     .populate({
//       path: "user",
//       select: "name email phone userType companyName",
//       match: populateMatch,
//     })
//     .populate({
//       path: "items.product",
//       select: "name slug shortDescription images",
//     })
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limitNum);


//     // Remove empty users (after populate)
//     const filteredOrders = orders.filter((o) => o.user !== null);

//     return res.status(200).json({
//       orders: filteredOrders,
//       totalPages: Math.ceil(totalOrders / limitNum),
//       currentPage: pageNum,
//     });

//   } catch (error) {
//     console.error("❌ Error fetching admin orders:", error);
//     return res.status(500).json({ message: "Server Error", error: error.message });
//   }
// }




import Product from "@/models/Product";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import Admin from "@/models/Admin";

import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";

export default async function handler(req, res) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const token = req.cookies.admin_auth;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔥 Load user from DB (permissions source of truth)
    const adminUser = await Admin.findById(decoded.id, {
      role: 1,
      permissions: 1,
    });

    if (!adminUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = {
      id: adminUser._id,
      role: adminUser.role,
      permissions: adminUser.permissions || [],
    };

    // 🔒 Permission check (admin always passes)
    if (!hasPermission(user, "orders")) {
      return res.status(403).json({ message: "No permission" });
    }

    /* ================= QUERY PARAMS ================= */
    const { status, userType, search, page = 1, limit = 10 } = req.query;

    const filters = {};

    // Status filter
    if (status) filters.status = status;

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    /* ================= SEARCH LOGIC ================= */
    let userIds = [];

    if (search) {
      const regex = new RegExp(search, "i");

      // Search user name
      const matchedUsers = await User.find({
        name: { $regex: regex },
      }).select("_id");

      userIds = matchedUsers.map((u) => u._id);

      filters.$or = [
        { orderNumber: { $regex: regex } },
        { user: { $in: userIds } },
      ];
    }

    /* ================= USER TYPE FILTER ================= */
    let populateMatch = {};
    if (userType) populateMatch.userType = userType;

    /* ================= FETCH DATA ================= */
    const totalOrders = await Order.countDocuments(filters);

    const orders = await Order.find(filters)
      .populate({
        path: "user",
        select: "name email phone userType companyName",
        match: populateMatch,
      })
      .populate({
        path: "items.product",
        select: "name slug shortDescription images",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Remove orders where user was filtered out by populate
    const filteredOrders = orders.filter((o) => o.user !== null);

    return res.status(200).json({
      orders: filteredOrders,
      totalPages: Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
    });

  } catch (error) {
    console.error("❌ Error fetching admin orders:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
}
