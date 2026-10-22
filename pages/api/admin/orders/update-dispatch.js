import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  // verifyAdmin returns null instead of throwing, so the result has to be checked
  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Admin access only" });

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { orderId, action } = req.body;

  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.dispatchRequest = action;

    // ✅ SAFE STATUS UPDATE
    if (action === "approved") {
      order.status = "Order Dispatched";
    }

    await order.save();

    res.status(200).json({ message: "Dispatch request updated" });
  } catch (error) {
    console.error("Dispatch update error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
