// pages/api/admin/orders/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  if (req.method === "GET") {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter).populate("user").sort({ createdAt: -1 });
    return res.json({ orders });
  }

  return res.status(405).end();
}
