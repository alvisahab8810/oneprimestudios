// pages/api/admin/orders/[id].js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

  if (req.method === "PUT") {
    const { status } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status = status;
    await order.save();
    // Optionally: send notification to user
    return res.json({ message: "Status updated", order });
  }

  return res.status(405).end();
}
