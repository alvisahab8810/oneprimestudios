// lib/flashSaleInput.js
// Checks and cleans what the admin flash sale editor sends.
import mongoose from "mongoose";
import Product from "@/models/Product";

export const MAX_FLASH_PRODUCTS = 200;

export const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const toDate = (v) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

// Returns { error } or { value } ready to save
export async function readFlashSaleBody(body = {}) {
  const title = String(body.title || "").trim().slice(0, 80);
  if (!title) return { error: "Enter a title for the deal" };

  let slug = slugify(body.slug || title);
  if (!slug) return { error: "Enter a link name using letters or numbers" };
  // "live" is the address of the live-deals feed
  if (slug === "live") slug = "live-deal";

  const dealPrice = Number(body.dealPrice);
  if (!Number.isFinite(dealPrice) || dealPrice < 1) return { error: "Enter a deal price of at least ₹1" };

  const startsAt = toDate(body.startsAt);
  const endsAt = toDate(body.endsAt);
  if (!startsAt) return { error: "Pick when the deal starts" };
  if (!endsAt) return { error: "Pick when the deal ends" };
  if (endsAt <= startsAt) return { error: "The end time must be after the start time" };

  const raw = Array.isArray(body.products) ? body.products : [];
  const seen = new Set();
  const items = [];
  for (const row of raw) {
    const id = String(row?.product?._id || row?.product || row?._id || "");
    if (!mongoose.Types.ObjectId.isValid(id) || seen.has(id)) continue;
    seen.add(id);
    let price = row?.price;
    if (price === "" || price === undefined || price === null) price = null;
    else {
      price = Number(price);
      if (!Number.isFinite(price) || price < 1) return { error: "Each product price must be at least ₹1, or left empty" };
      price = Math.round(price * 100) / 100;
    }
    items.push({ product: id, price });
  }
  if (items.length > MAX_FLASH_PRODUCTS) return { error: `A deal can hold up to ${MAX_FLASH_PRODUCTS} products` };

  // Only retail products can be in a flash sale
  if (items.length) {
    const ok = await Product.find({
      _id: { $in: items.map((i) => i.product) },
      productFor: { $in: ["b2c", "both", null] },
    })
      .select("_id")
      .lean();
    const allowed = new Set(ok.map((p) => String(p._id)));
    const rejected = items.length - items.filter((i) => allowed.has(i.product)).length;
    if (rejected) return { error: `${rejected} selected product${rejected > 1 ? "s are" : " is"} B2B only and cannot be in a retail flash sale` };
  }

  return {
    value: {
      title,
      slug,
      subtitle: String(body.subtitle || "").trim().slice(0, 160),
      dealPrice: Math.round(dealPrice * 100) / 100,
      products: items,
      startsAt,
      endsAt,
      enabled: body.enabled !== false,
      showOnHome: body.showOnHome !== false,
    },
  };
}
