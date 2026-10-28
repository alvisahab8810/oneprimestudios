// pages/api/coupons/offers.js
// The coupons worth advertising on a product page. Unlike
// /api/coupons/available this works for a visitor who is not signed in yet,
// because an offer is what makes them sign in and buy.
//
// Which side's coupons are listed: the signed-in buyer's own user type when
// there is a token, otherwise ?audience=b2b|b2c (B2C by default), so a B2C
// product page never advertises a partner-only code.
import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import getUserFromToken from "@/lib/getUserFromToken";
import { couponHeadline, isProductCoupon, couponProductIds } from "@/lib/couponRules";
import { normalizeAudience, B2B } from "@/lib/audience";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await getUserFromToken(req);

    // A signed-in buyer always sees their own side, whatever the URL says
    const audience = user
      ? normalizeAudience(user.userType)
      : normalizeAudience(req.query.audience) || "b2c";
    const userType = audience === B2B ? "partner" : "customer";

    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      allowedUserTypes: userType,
      $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Codes this buyer has already used to their limit are not advertised
    let usedByCode = {};
    if (user && coupons.length) {
      const usage = await Order.aggregate([
        { $match: { user: user._id, "coupon.code": { $in: coupons.map((c) => c.code) } } },
        { $group: { _id: "$coupon.code", count: { $sum: 1 } } },
      ]);
      usedByCode = usage.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});
    }

    // A product page only advertises the coupons that work there: the ones
    // tied to no product at all, and the ones tied to this very product
    const productId = String(req.query.productId || "").trim();

    const offers = coupons
      .filter((c) => {
        if (isProductCoupon(c)) {
          if (!productId) return false;
          if (!couponProductIds(c).includes(productId)) return false;
        }
        if (c.usageLimit && c.usedCount >= c.usageLimit) return false;
        if (user && (usedByCode[c.code] || 0) >= Number(c.perUserLimit || 1)) return false;
        return true;
      })
      .map((c) => ({
        code: c.code,
        headline: couponHeadline(c),
        minOrderAmount: c.minOrderAmount || 0,
        expiryDate: c.expiryDate || null,
      }));

    return res.json({ offers, audience });
  } catch (err) {
    console.error("Coupon offers error:", err);
    return res.status(500).json({ message: "Could not load offers" });
  }
}
