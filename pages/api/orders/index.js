// pages/api/orders/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method === "GET") {
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ orders });
  }

  return res.status(405).end();
}
