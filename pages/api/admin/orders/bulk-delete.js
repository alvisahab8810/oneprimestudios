import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { verifyAdmin } from "@/lib/verifyJWT";





export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();
  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { ids } = req.body;

  if (!ids || !ids.length) {
    return res.status(400).json({ message: "No orders selected" });
  }

  await Order.deleteMany({ _id: { $in: ids } });

  res.status(200).json({ success: true });
}
