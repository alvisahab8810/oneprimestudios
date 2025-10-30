// pages/api/orders/[id]/cancel.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

  if (req.method === "POST") {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(user._id)) return res.status(403).json({ message: "Forbidden" });

    // only allow cancellation for certain statuses
    if (!["Pending", "Confirmed"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in status: ${order.status}` });
    }

    order.status = "Cancelled";
    await order.save();
    // TODO: refund logic for payments, notifications, etc.

    return res.json({ message: "Order cancelled", order });
  }

  return res.status(405).end();
}
