// import dbConnect from "@/lib/dbConnect";
// import User from "@/models/User";
// import { verifyAdmin } from "@/lib/verifyJWT";

// export default async function handler(req, res) {
//   await dbConnect();

//   const admin = await verifyAdmin(req, res);
//   if (!admin) return res.status(401).json({ message: "Unauthorized" });

//   const { from, to, type = "all" } = req.query;

//   const dateFilter = {};
//   if (from) dateFilter.$gte = new Date(from);
//   if (to) {
//     dateFilter.$lte = new Date(to);
//     dateFilter.$lte.setHours(23, 59, 59, 999);
//   }

//   try {
//     let partners = await User.aggregate([
//       // 👤 ONLY PARTNERS
//       {
//         $match: { userType: "partner" }
//       },

//       // 🔗 LEFT JOIN ORDERS
//       {
//         $lookup: {
//           from: "orders",
//           let: { partnerId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$user", "$$partnerId"] },
//                 status: { $in: ["Order Delivered", "Order Dispatched"] },
//                 ...(from || to ? { createdAt: dateFilter } : {}),
//               }
//             }
//           ],
//           as: "orders"
//         }
//       },

//       // 🧮 CALCULATIONS
//       {
//         $addFields: {
//           totalOrders: { $size: "$orders" },
//           totalSales: { $sum: "$orders.total" }
//         }
//       },

//       // 🧹 RESPONSE SHAPE
//       {
//         $project: {
//           name: 1,
//           companyName: 1,
//           memberId: 1,
//           totalOrders: 1,
//           totalSales: { $ifNull: ["$totalSales", 0] }
//         }
//       }
//     ]);

//     // 🔍 FILTER TYPE (ADMIN FILTER)
//     if (type === "withOrders") {
//       partners = partners.filter(p => p.totalOrders > 0);
//     }

//     if (type === "noOrders") {
//       partners = partners.filter(p => p.totalOrders === 0);
//     }

//     // 📊 SORT: TOP SALES FIRST
//     partners.sort((a, b) => b.totalSales - a.totalSales);

//     return res.status(200).json({ partners });

//   } catch (err) {
//     console.error("Partner Sales Report Error:", err);
//     return res.status(500).json({ message: "Failed to load partner report" });
//   }
// }




import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { hasOrders } = req.query; // optional filter

  const partners = await User.aggregate([
    {
      $match: { userType: "partner" }
    },

    // 🔗 JOIN ORDERS
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    },

    // 📊 CALCULATIONS
    {
      $addFields: {
        totalOrders: { $size: "$orders" },
        totalSales: {
          $sum: "$orders.total"
        }
      }
    },

    // 🔍 OPTIONAL FILTER
    ...(hasOrders === "yes"
      ? [{ $match: { totalOrders: { $gt: 0 } } }]
      : hasOrders === "no"
      ? [{ $match: { totalOrders: 0 } }]
      : []),

    // 🧾 FINAL SHAPE
    {
      $project: {
        name: 1,
        companyName: 1,
        memberId: 1,
        totalOrders: 1,
        totalSales: { $ifNull: ["$totalSales", 0] }
      }
    },

    // 🏆 SORT BY PERFORMANCE
    { $sort: { totalSales: -1 } }
  ]);

  return res.status(200).json({ partners });
}
