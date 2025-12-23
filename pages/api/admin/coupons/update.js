// pages/api/admin/coupons/update.js
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

  if (req.method !== "PUT") return res.status(405).end();

  const {
    id,
    discountValue,
    maxDiscount,
    minOrderAmount,
    expiryDate,
    usageLimit,
    perUserLimit,
    allowedUserTypes,
    isActive,
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Coupon id required" });
  }

  try {
    await Coupon.findByIdAndUpdate(
      id,
      {
        discountValue,
        maxDiscount,
        minOrderAmount,
        expiryDate,
        usageLimit,
        perUserLimit,
        allowedUserTypes,
        isActive,
      },
      { runValidators: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Coupon update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
}
