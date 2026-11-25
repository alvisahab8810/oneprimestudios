// lib/couponScope.js — server side. Loads what the pure rules in
// lib/couponRules.js need to decide whether a product falls under a category
// coupon: each product's category, and every category's parent.
import Product from "@/models/Product";
import Category from "@/models/Category";
import { isCategoryCoupon } from "@/lib/couponRules";

const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// The product ids of cart lines or order lines, whichever shape they come in
export const itemProductIds = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => String(item?.product?._id || item?.product || ""))
    .filter(Boolean);

// Returns { categoryByProduct, parentByCategory }. Nothing is read from the
// database unless at least one of the coupons is limited to categories.
export async function loadCouponScope(coupons, productIds) {
  const list = (Array.isArray(coupons) ? coupons : [coupons]).filter(Boolean);
  if (!list.some(isCategoryCoupon)) return {};

  const ids = [...new Set((productIds || []).map(String).filter(isObjectId))];

  const [products, categories] = await Promise.all([
    ids.length ? Product.find({ _id: { $in: ids } }).select("category").lean() : [],
    Category.find({}).select("parent").lean(),
  ]);

  const categoryByProduct = {};
  products.forEach((p) => {
    if (p.category) categoryByProduct[String(p._id)] = String(p.category);
  });

  const parentByCategory = {};
  categories.forEach((c) => {
    if (c.parent) parentByCategory[String(c._id)] = String(c.parent);
  });

  return { categoryByProduct, parentByCategory };
}
