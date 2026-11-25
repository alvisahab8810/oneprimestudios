// lib/couponRules.js — one place for how a coupon discount is worked out and
// why a coupon is or is not usable, so the apply route and the "available
// offers" list on the cart can never disagree.

// A coupon may be tied to one or more products. With none listed it works on
// the whole cart, which is how every coupon made before this behaved.
export const couponProductIds = (coupon) =>
  (coupon?.products || []).map((id) => String(id?._id || id));

export const isProductCoupon = (coupon) => couponProductIds(coupon).length > 0;

// A coupon may also be tied to one or more categories. It then works on every
// product inside them, including the products of their sub-categories.
export const couponCategoryIds = (coupon) =>
  (coupon?.categories || []).map((id) => String(id?._id || id));

export const isCategoryCoupon = (coupon) => couponCategoryIds(coupon).length > 0;

// True when the coupon does not work on the whole cart
export const isRestrictedCoupon = (coupon) => isProductCoupon(coupon) || isCategoryCoupon(coupon);

// What the buyer is told when nothing in the cart falls under the coupon
export const couponScopeMessage = (coupon) =>
  isCategoryCoupon(coupon) && !isProductCoupon(coupon)
    ? "This coupon is only for selected categories"
    : "This coupon is only for selected products";

// Whether one product falls under the coupon. scope comes from
// lib/couponScope.js: { categoryByProduct, parentByCategory }. It is only
// needed for category coupons.
export function couponCoversProduct(coupon, productId, scope = {}) {
  if (!isRestrictedCoupon(coupon)) return true;
  const id = String(productId || "");
  if (!id) return false;
  if (couponProductIds(coupon).includes(id)) return true;

  const wanted = couponCategoryIds(coupon);
  if (!wanted.length) return false;

  // Walk up from the product's own category through its parents
  let category = String(scope?.categoryByProduct?.[id] || "");
  for (let hops = 0; category && hops < 10; hops += 1) {
    if (wanted.includes(category)) return true;
    category = String(scope?.parentByCategory?.[category] || "");
  }
  return false;
}

// The part of the cart this coupon may discount: the lines of the listed
// products and of the products in the listed categories for a restricted
// coupon, the whole cart for every other one.
export function couponEligibleTotal(coupon, items, cartTotal = 0, scope = {}) {
  if (!isRestrictedCoupon(coupon)) return Number(cartTotal) || 0;
  if (!Array.isArray(items)) return 0;

  const sum = items.reduce((total, item) => {
    const id = String(item?.product?._id || item?.product || "");
    if (!couponCoversProduct(coupon, id, scope)) return total;
    return total + Number(item?.price || 0) * Number(item?.quantity || 1);
  }, 0);

  return Math.round(sum * 100) / 100;
}

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
// eligibleTotal is the part of the cart the coupon may discount; it is the
// cart total itself unless the coupon is tied to particular products or categories.
export function couponBlockReason(coupon, { cartTotal = 0, userType, userUsage = 0, eligibleTotal }) {
  if (!coupon || !coupon.isActive) return "This coupon is no longer available";
  const usable = eligibleTotal === undefined ? Number(cartTotal) || 0 : Number(eligibleTotal) || 0;
  if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) return "Coupon expired";
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return "Coupon usage limit reached";
  if (userType && !(coupon.allowedUserTypes || []).includes(userType)) {
    return "Coupon not allowed for this user";
  }
  if (userUsage >= Number(coupon.perUserLimit || 1)) return "Coupon already used";
  if (isRestrictedCoupon(coupon) && usable <= 0) {
    return couponScopeMessage(coupon);
  }
  if (usable < Number(coupon.minOrderAmount || 0)) {
    const short = Number(coupon.minOrderAmount || 0) - usable;
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
