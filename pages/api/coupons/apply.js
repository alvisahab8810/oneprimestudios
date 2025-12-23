import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();
  if (req.method !== "POST") return res.status(405).end();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { code, cartTotal } = req.body;

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
  });

  if (!coupon) return res.status(400).json({ message: "Invalid coupon" });

  if (coupon.expiryDate && new Date() > coupon.expiryDate)
    return res.status(400).json({ message: "Coupon expired" });

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return res.status(400).json({ message: "Coupon usage limit reached" });

  if (cartTotal < coupon.minOrderAmount)
    return res.status(400).json({
      message: `Minimum order ₹${coupon.minOrderAmount} required`,
    });

  if (!coupon.allowedUserTypes.includes(user.userType))
    return res.status(403).json({ message: "Coupon not allowed for this user" });

  // per-user usage check
  const userUsage = await Order.countDocuments({
    user: user._id,
    "coupon.code": coupon.code,
  });

  if (userUsage >= coupon.perUserLimit)
    return res.status(400).json({ message: "Coupon already used" });

  // calculate discount
  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount)
      discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, cartTotal);

  return res.json({
    success: true,
    discount,
    finalAmount: cartTotal - discount,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  });
}
