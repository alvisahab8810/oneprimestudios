// // pages/api/orders/[id].js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import mongoose from "mongoose";

// export default async function handler(req, res) {
//   await dbConnect();
//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   const { id } = req.query;
//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

//   if (req.method === "GET") {
//     const order = await Order.findById(id).populate("items.product").lean();
//     if (!order) return res.status(404).json({ message: "Order not found" });
//     if (String(order.user) !== String(user._id)) return res.status(403).json({ message: "Forbidden" });
//     return res.json({ order });
//   }

//   return res.status(405).end();
// }





// pages/api/orders/[id].js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Product from "@/models/Product"; // ✅ Add this line
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) 
    return res.status(400).json({ message: "Invalid id" });

  if (req.method === "GET") {
    try {
      const order = await Order.findById(id)
        .populate("items.product")
        .populate("user", "name email phone address city state pincode gstNumber userType") // ✅ populate user
        .lean();

      if (!order) return res.status(404).json({ message: "Order not found" });
      if (String(order.user._id) !== String(user._id) && user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      return res.json({ order });
    } catch (err) {
      console.error("Order fetch error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  return res.status(405).end();
}
