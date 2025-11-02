// // pages/api/admin/orders/[id].js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import { verifyAdmin } from "@/lib/verifyJWT"; // ✅ same as used in /api/admin/orders/index.js
// import Order from "@/models/Order";
// import mongoose from "mongoose";

// export default async function handler(req, res) {
//   await dbConnect();
//   const user = await getUserFromToken(req);
//   if (!user || user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

//   const { id } = req.query;
//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

//   if (req.method === "PUT") {
//     const { status } = req.body;
//     const order = await Order.findById(id);
//     if (!order) return res.status(404).json({ message: "Order not found" });
//     order.status = status;
//     await order.save();
//     // Optionally: send notification to user
//     return res.json({ message: "Status updated", order });
//   }

//   return res.status(405).end();
// }



import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";     // ✅ for user populate
import Product from "@/models/Product"; // ✅ add this line
import { verifyAdmin } from "@/lib/verifyJWT";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Order ID" });
  }

if (req.method === "GET") {
  try {
    const order = await Order.findById(id)
      .populate("user", "name email phone userType companyName")
      .populate("items.product", "name mainImage price")
      .lean(); // ✅ convert to plain JS object (important)

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ Ensure uploadedFiles array always exists
    order.uploadedFiles = order.uploadedFiles || [];

    return res.status(200).json({ order });
  } catch (err) {
    console.error("❌ Error fetching order:", err);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
}

 if (req.method === "PUT") {
  try {
    const { status, remarks } = req.body; // ✅ get remarks from frontend

    if (!status)
      return res.status(400).json({ message: "Status is required" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });


    // ✅ update status
    order.status = status;

    // ✅ save remarks only when rejected
    if (status === "Design Rejected" && remarks) {
      order.remarks = remarks;
    } else if (status !== "Design Rejected") {
      order.remarks = ""; // clear old remarks
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    return res.status(500).json({ message: "Failed to update order" });
  }
}


  return res.status(405).json({ message: "Method not allowed" });
}
