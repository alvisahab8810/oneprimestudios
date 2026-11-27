// lib/flashSale.js
// Server-side lookups for flash sales. Pricing rules live in lib/flashPricing.js.
import FlashSale from "@/models/FlashSale";
import { applyFlashPrice, flashAppliesTo, itemDealPrice } from "@/lib/flashPricing";

const liveFilter = (now) => ({ enabled: true, startsAt: { $lte: now }, endsAt: { $gt: now } });

// productId → the deal that applies to it right now. When two live deals
// share a product, the lower price wins.
export async function getLiveDealMap(productIds = [], now = new Date()) {
  const ids = [...new Set(productIds.map(String).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const sales = await FlashSale.find({ ...liveFilter(now), "products.product": { $in: ids } })
    .select("title slug dealPrice products endsAt")
    .lean();

  const wanted = new Set(ids);
  for (const sale of sales) {
    for (const item of sale.products || []) {
      const id = String(item.product);
      if (!wanted.has(id)) continue;
      const price = itemDealPrice(sale, item);
      const current = map.get(id);
      if (!current || price < current.price) {
        map.set(id, { saleId: String(sale._id), title: sale.title, slug: sale.slug, price, endsAt: sale.endsAt });
      }
    }
  }
  return map;
}

// Products that are in any flash sale at all, live or not. A cart line for
// one of these may have been priced while a deal was running, so it is priced
// again before it is shown or ordered.
export async function getFlashProductIds(productIds = []) {
  const ids = [...new Set(productIds.map(String).filter(Boolean))];
  if (!ids.length) return new Set();
  const found = await FlashSale.distinct("products.product", { "products.product": { $in: ids } });
  const wanted = new Set(ids);
  return new Set(found.map(String).filter((id) => wanted.has(id)));
}

// The product as this buyer should be charged for it right now
export const priceableProduct = (product, dealMap, user) => {
  const plain = product && typeof product.toObject === "function" ? product.toObject() : product;
  if (!plain || !flashAppliesTo(plain, user)) return plain;
  const deal = dealMap.get(String(plain._id));
  return deal ? applyFlashPrice(plain, deal) : plain;
};
