// lib/stockRules.js — one place for the stock and minimum-order rules,
// so the product page, the cart and the order API all agree.

// Units currently available. Anything missing or negative counts as none.
export const getStock = (product) => {
  const n = Number(product?.stock);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

// A product is unavailable either because the admin marked it so,
// or because there are no units left.
export const isOutOfStock = (product) =>
  product?.stockStatus === "out_of_stock" || getStock(product) <= 0;

export const getMinOrderQty = (product) => {
  const min = Number(product?.minOrderQty);
  return min > 0 ? min : 1;
};

// The largest quantity a buyer can order right now.
export const getMaxOrderQty = (product) => getStock(product);

// Quantities the buyer may pick: the minimum, plus any pricing tier at or above it.
// Tiers below the minimum are dropped, otherwise the minus button walks past the MOQ.
// Steps above the available stock are dropped too.
export const buildQuantityLadder = (product) => {
  const min = getMinOrderQty(product);
  const stock = getStock(product);
  const tiers = (product?.pricingTiers || [])
    .map((t) => Number(t.minQty))
    .filter((n) => Number.isFinite(n) && n > min);
  const steps = Array.from(new Set([min, ...tiers])).sort((a, b) => a - b);
  const withinStock = steps.filter((n) => n <= stock);
  return withinStock.length ? withinStock : steps.slice(0, 1);
};

// Returns an error message when this product cannot be ordered in this quantity,
// or "" when it is fine.
export function checkOrderable(product, quantity) {
  if (!product) return "Product not found";
  if (isOutOfStock(product)) return `"${product.name}" is out of stock`;

  const min = getMinOrderQty(product);
  const stock = getStock(product);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return "Invalid quantity";
  if (qty < min) return `Minimum order quantity for "${product.name}" is ${min}`;
  if (min > stock)
    return `"${product.name}" is not available right now — only ${stock} left, and the minimum order is ${min}`;
  if (qty > stock) return `Only ${stock} units of "${product.name}" are left in stock`;

  return "";
}
