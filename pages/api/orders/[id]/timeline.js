// The tracking log a buyer sees on an order: every step the job has been
// through, oldest first, with who moved it.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { buildTimeline } from "@/lib/orderHistory";
import { stageLabel } from "@/lib/orderStages";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const order = await Order.findById(id)
      .select("user orderNumber status createdAt updatedAt deliveredAt statusHistory shipment")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({
      orderNumber: order.orderNumber || "",
      status: order.status,
      stage: stageLabel(order.status),
      steps: buildTimeline(order).map((step) => ({
        ...step,
        stage: stageLabel(step.status) || step.status,
      })),
    });
  } catch (err) {
    console.error("Order timeline error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
