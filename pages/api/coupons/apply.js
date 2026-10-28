import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import getUserFromToken from "@/lib/getUserFromToken";
import {
  couponDiscount,
  couponBlockReason,
  couponEligibleTotal,
  isProductCoupon,
} from "@/lib/couponRules";

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

  // A coupon tied to particular products only discounts those products' lines,
  // so the buyer's own cart is read here rather than trusting the total sent
  let eligibleTotal = Number(cartTotal) || 0;
  if (isProductCoupon(coupon)) {
    const cart = await Cart.findOne({ user: user._id }).lean();
    eligibleTotal = couponEligibleTotal(coupon, cart?.items || [], cartTotal);
  }

  // The same checks, in the same order, as the available-offers list
  const reason = couponBlockReason(coupon, {
    cartTotal: Number(cartTotal) || 0,
    userType: user.userType,
    userUsage,
    eligibleTotal,
  });
  if (reason) {
    const status = reason === "Coupon not allowed for this user" ? 403 : 400;
    return res.status(status).json({ message: reason });
  }

  const discount = couponDiscount(coupon, eligibleTotal);

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
