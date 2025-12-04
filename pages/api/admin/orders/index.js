


// import dbConnect from "@/lib/dbConnect";
// import Order from "@/models/Order";
// import User from "@/models/User"; // ✅ must import this before populate
// import { verifyAdmin } from "@/lib/verifyJWT";

// export default async function handler(req, res) {
//   try {
//     await dbConnect();

//     const admin = await verifyAdmin(req, res);
//     if (!admin) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const { status } = req.query;
//     const filter = status ? { status } : {};

//     const orders = await Order.find(filter)
//       .populate("user", "name email phone userType companyName")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({ orders });
//   } catch (error) {
//     console.error("❌ Error fetching admin orders:", error);
//     return res.status(500).json({ message: "Server Error", error: error.message });
//   }
// }





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

    // Filters
    const { status, userType, page = 1, limit = 10 } = req.query;

    const filters = {};

    if (status) filters.status = status;

    // 🔥 Filter by B2B / B2C user type
    if (userType) {
      // We must join on userType using populate match
      filters.userType = userType;
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // 🔥 Count total before pagination
    const totalOrders = await Order.countDocuments(
      status ? { status } : {}
    );

    // Main query
    const orders = await Order.find(status ? { status } : {})
      .populate({
        path: "user",
        select: "name email phone userType companyName",
        match: userType ? { userType } : {}, // 🔥 applies B2B/B2C filter
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // 🔥 Remove orders where populate-filter removed user
    const filteredOrders = orders.filter((o) => o.user !== null);

    return res.status(200).json({
      orders: filteredOrders,
      totalPages: Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("❌ Error fetching admin orders:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
}
