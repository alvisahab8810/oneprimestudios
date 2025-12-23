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

  if (req.method !== "DELETE") return res.status(405).end();

  const { id } = req.body;

  try {
    await Coupon.findByIdAndDelete(id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
}
