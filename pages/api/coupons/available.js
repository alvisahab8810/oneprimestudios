// pages/api/coupons/available.js
// The coupons the signed-in buyer may use, for the "Available offers" list on
// the cart. Works for both partner (B2B) and retail (B2C) accounts: a coupon is
// only listed when the buyer's own user type is in its allowedUserTypes.
//
// Coupons the buyer has already used up, that have expired or that have hit
// their global limit are left out entirely. One that only needs a bigger cart
// is listed with the amount still to add, so the buyer can see it coming.
import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import getUserFromToken from "@/lib/getUserFromToken";
import {
  couponDiscount,
  couponBlockReason,
  couponHeadline,
  couponEligibleTotal,
  isProductCoupon,
} from "@/lib/couponRules";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const cartTotal = Number(req.query.cartTotal) || 0;
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      allowedUserTypes: user.userType,
      $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // How many times this buyer has already used each of these codes
    const codes = coupons.map((c) => c.code);
    const usage = codes.length
      ? await Order.aggregate([
          { $match: { user: user._id, "coupon.code": { $in: codes } } },
          { $group: { _id: "$coupon.code", count: { $sum: 1 } } },
        ])
      : [];
    const usedByCode = usage.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});

    // Read once: a coupon tied to particular products is only worth listing
    // when one of those products is actually in this cart
    const hasProductCoupon = coupons.some(isProductCoupon);
    const cartItems = hasProductCoupon
      ? ((await Cart.findOne({ user: user._id }).lean())?.items || [])
      : [];

    const offers = [];

    for (const coupon of coupons) {
      const userUsage = usedByCode[coupon.code] || 0;
      const eligibleTotal = couponEligibleTotal(coupon, cartItems, cartTotal);
      const reason = couponBlockReason(coupon, {
        cartTotal,
        userType: user.userType,
        userUsage,
        eligibleTotal,
      });

      // Nothing the buyer can do about these, so they are not shown at all
      const permanentlyOut =
        reason === "Coupon already used" ||
        reason === "Coupon usage limit reached" ||
        reason === "Coupon expired" ||
        reason === "Coupon not allowed for this user" ||
        reason === "This coupon is only for selected products" ||
        reason === "This coupon is no longer available";
      if (permanentlyOut) continue;

      offers.push({
        code: coupon.code,
        headline: couponHeadline(coupon),
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount || null,
        minOrderAmount: coupon.minOrderAmount || 0,
        expiryDate: coupon.expiryDate || null,
        // What the buyer would save on the cart as it stands
        discount: reason ? 0 : couponDiscount(coupon, eligibleTotal),
        eligible: !reason,
        reason: reason || "",
      });
    }

    // Biggest saving first, then the ones that just need a bigger cart
    offers.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (b.discount !== a.discount) return b.discount - a.discount;
      return a.minOrderAmount - b.minOrderAmount;
    });

    return res.json({ offers });
  } catch (err) {
    console.error("Available coupons error:", err);
    return res.status(500).json({ message: "Could not load offers" });
  }
}
