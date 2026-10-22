import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User"; // 🔥 IMPORTANT: ADD THIS
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  // verifyAdmin returns null instead of throwing, so the result has to be checked
  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Admin access only" });

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Dispatch requests belong to the partner (B2B) flow. A retail order can
    // carry the same flag — booking a courier sets it — so it is kept out here.
    const partners = await User.find({ userType: "partner" }, { _id: 1 }).lean();

    const orders = await Order.find({
      dispatchRequest: { $in: ["pending", "approved", "rejected"] },
      user: { $in: partners.map((p) => p._id) },
    })
      .populate("user", "name email phone")
      .sort({ updatedAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Dispatch list error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
