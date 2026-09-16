// lib/stockRules.js — one place for the stock and minimum-order rules,
// so the product page, the cart and the order API all agree.

export const isOutOfStock = (product) => product?.stockStatus === "out_of_stock";

export const getMinOrderQty = (product) => {
  const min = Number(product?.minOrderQty);
  return min > 0 ? min : 1;
};

// Quantities the buyer may pick: the minimum, plus any pricing tier at or above it.
// Tiers below the minimum are dropped, otherwise the minus button walks past the MOQ.
export const buildQuantityLadder = (product) => {
  const min = getMinOrderQty(product);
  const tiers = (product?.pricingTiers || [])
    .map((t) => Number(t.minQty))
    .filter((n) => Number.isFinite(n) && n > min);
  return Array.from(new Set([min, ...tiers])).sort((a, b) => a - b);
};

// Returns an error message when this product cannot be ordered in this quantity,
// or "" when it is fine.
export function checkOrderable(product, quantity) {
  if (!product) return "Product not found";
  if (isOutOfStock(product)) return `"${product.name}" is out of stock`;

  const min = getMinOrderQty(product);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return "Invalid quantity";
  if (qty < min) return `Minimum order quantity for "${product.name}" is ${min}`;

  return "";
}
