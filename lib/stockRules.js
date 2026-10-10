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

// Fallback used for products where the admin has not set their own number.
// At or below this many units the storefront nudges a retail buyer with the
// exact count ("Only 5 left") instead of a plain "In Stock".
export const LOW_STOCK_THRESHOLD = 20;

// The product's own threshold when the admin set one, otherwise the fallback.
// A stored 0 is a deliberate "never show the count" and is kept.
export const getLowStockThreshold = (product) => {
  const raw = product?.lowStockThreshold;
  // Unset must fall back, not read as 0 — Number(null) is 0
  if (raw === null || raw === undefined || raw === "") return LOW_STOCK_THRESHOLD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : LOW_STOCK_THRESHOLD;
};

// Normalises what the admin form sends: blank means "use the site default" and
// is stored as null, a number is kept, anything unusable falls back to null.
export const parseLowStockThreshold = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

// True while the product is still orderable but running low.
export const isLowStock = (product) => {
  const stock = getStock(product);
  const threshold = getLowStockThreshold(product);
  return stock > 0 && threshold > 0 && stock <= threshold;
};

// True for a product sold on the B2B side. Partners are shown nothing about
// stock, so the messages below stay generic for these products. This is the
// same rule the product page uses to pick its B2B layout.
export const isB2BProduct = (product) =>
  !!product?.b2bOptions?.enabled && product?.productFor !== "b2c";

export const getMinOrderQty = (product) => {
  const min = Number(product?.minOrderQty);
  return min > 0 ? min : 1;
};

// The largest quantity a buyer can order right now.
export const getMaxOrderQty = (product) => getStock(product);

// Quantities the buyer may pick: the minimum, plus any pricing tier at or above it,
// plus the fixed quantity options the admin set. "side" picks which set of fixed
// options applies ("b2b" / "b2c"); leaving it out takes both, which is what the
// cart does because it shows items for either side.
// Steps below the minimum are dropped, otherwise the minus button walks past the MOQ.
// Steps above the available stock are dropped too.
export const buildQuantityLadder = (product, side) => {
  const min = getMinOrderQty(product);
  const stock = getStock(product);
  const tiers = (product?.pricingTiers || []).map((t) => Number(t.minQty));
  const fixed = [
    ...(side === "b2c" ? [] : product?.b2bOptions?.quantityOptions || []),
    ...(side === "b2b" ? [] : product?.b2cOptions?.quantityOptions || []),
  ].map(Number);
  const extra = [...tiers, ...fixed].filter((n) => Number.isFinite(n) && n > min);
  const steps = Array.from(new Set([min, ...extra])).sort((a, b) => a - b);
  const withinStock = steps.filter((n) => n <= stock);
  return withinStock.length ? withinStock : steps.slice(0, 1);
};

// Returns an error message when this product cannot be ordered in this quantity,
// or "" when it is fine.
export function checkOrderable(product, quantity) {
  if (!product) return "Product not found";
  const hideStock = isB2BProduct(product);
  if (isOutOfStock(product))
    return hideStock
      ? `"${product.name}" is not available right now`
      : `"${product.name}" is out of stock`;

  const min = getMinOrderQty(product);
  const stock = getStock(product);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return "Invalid quantity";
  if (qty < min) return `Minimum order quantity for "${product.name}" is ${min}`;
  // The exact count is withheld on the B2B side
  if (min > stock)
    return hideStock
      ? `"${product.name}" is not available in the minimum order quantity of ${min} right now`
      : `"${product.name}" is not available right now — only ${stock} left, and the minimum order is ${min}`;
  if (qty > stock)
    return hideStock
      ? `"${product.name}" is not available in that quantity right now`
      : `Only ${stock} units of "${product.name}" are left in stock`;

  return "";
}
