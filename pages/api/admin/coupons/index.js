import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  try {
    await verifyAdmin(req);
  } catch {
    return res.status(401).json({ message: "Admin access only" });
  }

  if (req.method !== "GET") return res.status(405).end();

  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
}
