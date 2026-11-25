import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
// Registered here so the category names can be populated
import "@/models/Category";
import { requireAdminPermission } from "@/lib/adminAuth";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "coupons");
  if (!admin) return;

  if (req.method !== "GET") return res.status(405).end();

  try {
    const coupons = await Coupon.find()
      // Names so the list and the edit form can show which products a coupon is tied to
      .populate("products", "name")
      .populate("categories", "name")
      .sort({ createdAt: -1 });
    res.json(coupons);
  } catch {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
}
