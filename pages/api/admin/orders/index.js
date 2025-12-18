



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
//       .populate({
//         path: "user",
//         select: "name email phone userType companyName",
//         match: populateMatch,
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum);

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
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const admin = await verifyAdmin(req, res);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { status, userType, search, page = 1, limit = 10 } = req.query;

    const filters = {};

    // Status filter
    if (status) filters.status = status;

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // ---- SEARCH LOGIC ----
    let userIds = [];

    if (search) {
      const regex = new RegExp(search, "i");

      // Search user name
      const matchedUsers = await User.find({ name: { $regex: regex } }).select("_id");
      userIds = matchedUsers.map((u) => u._id);

      // Now apply OR search only once
      filters.$or = [
        { orderNumber: { $regex: regex } },
        { user: { $in: userIds } }
      ];
    }

    // ---- USER TYPE LOGIC ----
    let populateMatch = {};
    if (userType) populateMatch.userType = userType;

    // Count matching orders
    const totalOrders = await Order.countDocuments(filters);

    // Fetch orders
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


    // Remove empty users (after populate)
    const filteredOrders = orders.filter((o) => o.user !== null);

    return res.status(200).json({
      orders: filteredOrders,
      totalPages: Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
    });

  } catch (error) {
    console.error("❌ Error fetching admin orders:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}
