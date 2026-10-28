// pages/api/admin/coupons/update.js
import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import { requireAdminPermission } from "@/lib/adminAuth";

// Only real product ids are stored, so a bad value can never silently turn a
// product coupon into one that works on everything
const parseProducts = (list) =>
  (Array.isArray(list) ? list : [])
    .map((id) => String(id || "").trim())
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));


export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "coupons");
  if (!admin) return;

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
    products,
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
        // Left out of the request means "leave the product list alone"
        ...(products === undefined ? {} : { products: parseProducts(products) }),
      },
      { runValidators: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Coupon update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
}
