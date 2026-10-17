// lib/couponRules.js — one place for how a coupon discount is worked out and
// why a coupon is or is not usable, so the apply route and the "available
// offers" list on the cart can never disagree.

export function couponDiscount(coupon, cartTotal) {
  const total = Number(cartTotal) || 0;
  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (total * Number(coupon.discountValue || 0)) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  } else {
    discount = Number(coupon.discountValue || 0);
  }

  discount = Math.min(discount, total);
  return Math.max(0, Math.round(discount * 100) / 100);
}

// A short line a buyer can act on, in the same words the apply route uses.
// Returns null when the coupon can be applied right now.
export function couponBlockReason(coupon, { cartTotal = 0, userType, userUsage = 0 }) {
  if (!coupon || !coupon.isActive) return "This coupon is no longer available";
  if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) return "Coupon expired";
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return "Coupon usage limit reached";
  if (userType && !(coupon.allowedUserTypes || []).includes(userType)) {
    return "Coupon not allowed for this user";
  }
  if (userUsage >= Number(coupon.perUserLimit || 1)) return "Coupon already used";
  if (Number(cartTotal) < Number(coupon.minOrderAmount || 0)) {
    const short = Number(coupon.minOrderAmount || 0) - Number(cartTotal || 0);
    return `Add ₹${Math.ceil(short)} more to use this coupon`;
  }
  return null;
}

// "20% OFF up to ₹500" / "₹250 OFF" — the headline shown on an offer card.
export function couponHeadline(coupon) {
  if (coupon.discountType === "percentage") {
    const base = `${Number(coupon.discountValue || 0)}% OFF`;
    return coupon.maxDiscount ? `${base} up to ₹${Number(coupon.maxDiscount)}` : base;
  }
  return `₹${Number(coupon.discountValue || 0)} OFF`;
}
