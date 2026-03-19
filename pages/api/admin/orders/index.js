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

    /* ── Auth ─────────────────────────────────────────────────────────────── */
    const token = req.cookies.admin_auth;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyJWT(token);
    if (!decoded) return res.status(401).json({ message: "Unauthorized" });

    const adminUser = await Admin.findById(decoded.id, { role: 1, permissions: 1 });
    if (!adminUser) return res.status(401).json({ message: "Unauthorized" });

    const user = {
      id:          adminUser._id,
      role:        adminUser.role,
      permissions: adminUser.permissions || [],
    };

    if (!hasPermission(user, "orders")) {
      return res.status(403).json({ message: "No permission" });
    }

    /* ── Query params ─────────────────────────────────────────────────────── */
    const { status, userType, search, page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip     = (pageNum - 1) * limitNum;

    /* ── Build filter ─────────────────────────────────────────────────────── */
    const filters = {};

    // Status
    if (status) filters.status = status;

    // userType — must pre-fetch matching user IDs (populate match can't be used
    // for filtering before pagination — it runs AFTER and silently removes rows)
    if (userType) {
      const usersOfType = await User.find({ userType }).select("_id").lean();
      const typeIds = usersOfType.map((u) => u._id);
      filters.user = { $in: typeIds };
    }

    // Search — matches ANY of: order number, customer name, product name
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      // 1) Users whose name matches
      const matchedUsers = await User.find({ name: regex }).select("_id").lean();
      const matchedUserIds = matchedUsers.map((u) => u._id);

      // 2) Products whose name matches
      const matchedProducts = await Product.find({ name: regex }).select("_id").lean();
      const matchedProductIds = matchedProducts.map((p) => p._id);

      // 3) Orders that contain those products (via items.product)
      // We need order IDs where at least one item has a matching product
      const ordersWithProduct = matchedProductIds.length > 0
        ? await Order.find({ "items.product": { $in: matchedProductIds } }).select("_id").lean()
        : [];
      const orderIdsFromProduct = ordersWithProduct.map((o) => o._id);

      // Combine all $or conditions
      const orConditions = [
        { orderNumber: { $regex: regex } },
      ];

      if (matchedUserIds.length > 0) {
        orConditions.push({ user: { $in: matchedUserIds } });
      }

      if (orderIdsFromProduct.length > 0) {
        orConditions.push({ _id: { $in: orderIdsFromProduct } });
      }

      // Merge with existing user filter if userType was also set
      if (filters.user) {
        // userType filter already narrows user — keep it AND add search
        // We need: (userType matches) AND (orderNumber OR userName OR productName)
        const existingUserFilter = filters.user;
        delete filters.user;
        filters.$and = [
          { user: existingUserFilter },
          { $or: orConditions },
        ];
      } else {
        filters.$or = orConditions;
      }
    }

    /* ── Fetch ────────────────────────────────────────────────────────────── */
    const totalOrders = await Order.countDocuments(filters);

    const orders = await Order.find(filters)
      .populate({
        path:   "user",
        select: "name email phone userType companyName",
      })
      .populate({
        path:   "items.product",
        select: "name slug shortDescription images mainImage",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      orders,
      total:       totalOrders,
      totalPages:  Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
    });

  } catch (error) {
    console.error("❌ Error fetching admin orders:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}





// import Product from "@/models/Product";
// import dbConnect from "@/lib/dbConnect";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import Admin from "@/models/Admin";

// import { verifyJWT } from "@/lib/verifyJWT";
// import { hasPermission } from "@/lib/hasPermission";

// export default async function handler(req, res) {
//   try {
//     await dbConnect();

//     /* ================= AUTH ================= */
//     const token = req.cookies.admin_auth;
//     if (!token) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // 🔥 Load user from DB (permissions source of truth)
//     const adminUser = await Admin.findById(decoded.id, {
//       role: 1,
//       permissions: 1,
//     });

//     if (!adminUser) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const user = {
//       id: adminUser._id,
//       role: adminUser.role,
//       permissions: adminUser.permissions || [],
//     };

//     // 🔒 Permission check (admin always passes)
//     if (!hasPermission(user, "orders")) {
//       return res.status(403).json({ message: "No permission" });
//     }

//     /* ================= QUERY PARAMS ================= */
//     const { status, userType, search, page = 1, limit = 10 } = req.query;

//     const filters = {};

//     // Status filter
//     if (status) filters.status = status;

//     // Pagination
//     const pageNum = Number(page);
//     const limitNum = Number(limit);
//     const skip = (pageNum - 1) * limitNum;

//     /* ================= SEARCH LOGIC ================= */
//     let userIds = [];

//     if (search) {
//       const regex = new RegExp(search, "i");

//       // Search user name
//       const matchedUsers = await User.find({
//         name: { $regex: regex },
//       }).select("_id");

//       userIds = matchedUsers.map((u) => u._id);

//       filters.$or = [
//         { orderNumber: { $regex: regex } },
//         { user: { $in: userIds } },
//       ];
//     }

//     /* ================= USER TYPE FILTER ================= */
//     let populateMatch = {};
//     if (userType) populateMatch.userType = userType;

//     /* ================= FETCH DATA ================= */
//     const totalOrders = await Order.countDocuments(filters);

//     const orders = await Order.find(filters)
//       .populate({
//         path: "user",
//         select: "name email phone userType companyName",
//         match: populateMatch,
//       })
//       .populate({
//         path: "items.product",
//         select: "name slug shortDescription images",
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

//     // Remove orders where user was filtered out by populate
//     const filteredOrders = orders.filter((o) => o.user !== null);

//     return res.status(200).json({
//       orders: filteredOrders,
//       totalPages: Math.ceil(totalOrders / limitNum),
//       currentPage: pageNum,
//     });

//   } catch (error) {
//     console.error("❌ Error fetching admin orders:", error);
//     return res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// }
