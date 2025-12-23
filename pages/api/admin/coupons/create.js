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

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ NORMALIZE INPUT (THIS IS THE FIX)
    const {
      code,
      discountType,

      // accept both names safely
      discountValue: discountValueFromBody,
      value,

      maxDiscount,
      minOrderAmount,

      // accept both names safely
      expiryDate,
      expiresAt,

      usageLimit,
      perUserLimit,
      allowedUserTypes,
    } = req.body;

    const discountValue = discountValueFromBody ?? value;
    const finalExpiryDate = expiryDate ?? expiresAt;

    // ✅ VALIDATION
  // 🔕 TEMPORARILY RELAXED VALIDATION
if (!code || !discountType) {
  return res.status(400).json({
    message: "Required fields missing",
    required: ["code", "discountType"],
    received: req.body,
  });
}


    const exists = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (exists) {
      return res.status(400).json({ message: "Coupon already exists" });
    }

    const coupon = await Coupon.create({
  code: code.toUpperCase(),
  discountType,

  // 🔕 TEMP DEFAULT (SAFE)
  discountValue: discountValue ?? 0,

  maxDiscount,
  minOrderAmount,
  expiryDate: finalExpiryDate,
  usageLimit,
  perUserLimit,
  allowedUserTypes,
});


    return res.status(201).json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({ message: "Failed to create coupon" });
  }
}
