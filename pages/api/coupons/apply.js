import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import getUserFromToken from "@/lib/getUserFromToken";
import { couponDiscount, couponBlockReason } from "@/lib/couponRules";

export default async function handler(req, res) {
  await dbConnect();
  if (req.method !== "POST") return res.status(405).end();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { code, cartTotal } = req.body;
  if (!code) return res.status(400).json({ message: "Coupon code required" });

  const coupon = await Coupon.findOne({
    code: String(code).toUpperCase().trim(),
    isActive: true,
  });

  if (!coupon) return res.status(400).json({ message: "Invalid coupon" });

  // per-user usage check
  const userUsage = await Order.countDocuments({
    user: user._id,
    "coupon.code": coupon.code,
  });

  // The same checks, in the same order, as the available-offers list
  const reason = couponBlockReason(coupon, {
    cartTotal: Number(cartTotal) || 0,
    userType: user.userType,
    userUsage,
  });
  if (reason) {
    const status = reason === "Coupon not allowed for this user" ? 403 : 400;
    return res.status(status).json({ message: reason });
  }

  const discount = couponDiscount(coupon, cartTotal);

  return res.json({
    success: true,
    discount,
    finalAmount: (Number(cartTotal) || 0) - discount,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  });
}
