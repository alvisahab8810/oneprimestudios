// lib/flashSalePublic.js
// Shapes a flash sale for shoppers: only published retail products, each with
// its normal price and its deal price.
import Product from "@/models/Product";
import { applyFlashPrice, itemDealPrice, regularBatchPrice } from "@/lib/flashPricing";

const PRODUCT_FIELDS = "name slug mainImage basePrice salePrice minOrderQty pricingTiers productFor status stockStatus attributes";

export async function publicSale(sale, { limit = 0 } = {}) {
  const ids = (sale.products || []).map((p) => p.product);
  const docs = ids.length
    ? await Product.find({ _id: { $in: ids }, status: "published", productFor: { $in: ["b2c", "both", null] } })
        .select(PRODUCT_FIELDS)
        .lean()
    : [];
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  let products = (sale.products || [])
    .map((item) => {
      const p = byId.get(String(item.product));
      if (!p) return null;
      const regular = regularBatchPrice(p);
      const priced = applyFlashPrice(p, { price: itemDealPrice(sale, item) });
      const deal = Number(priced.salePrice) || regular;
      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        mainImage: p.mainImage || "",
        minOrderQty: p.minOrderQty || 1,
        regularPrice: regular,
        dealPrice: deal,
        outOfStock: p.stockStatus === "out_of_stock",
        // Options or quantity slabs change the price, so the card sends shoppers to the product page
        needsOptions: (p.attributes || []).length > 0 || (p.pricingTiers || []).length > 0,
      };
    })
    .filter(Boolean);

  const total = products.length;
  if (limit > 0) products = products.slice(0, limit);

  return {
    _id: sale._id,
    title: sale.title,
    slug: sale.slug,
    subtitle: sale.subtitle || "",
    dealPrice: sale.dealPrice,
    startsAt: sale.startsAt,
    endsAt: sale.endsAt,
    productCount: total,
    products,
  };
}
