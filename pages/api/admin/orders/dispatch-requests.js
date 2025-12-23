import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User"; // 🔥 IMPORTANT: ADD THIS
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  try {
    await verifyAdmin(req);
  } catch (err) {
    return res.status(401).json({ message: "Admin access only" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orders = await Order.find({
      dispatchRequest: { $in: ["pending", "approved", "rejected"] },
    })
      .populate("user", "name email phone")
      .sort({ updatedAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Dispatch list error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
