// The rate card for one product group. Prices are worked out here, never in the
// browser, so a partner cannot talk the page into quoting its own figures.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import Product from "@/models/Product";
import RateCourier from "@/models/RateCourier";
import requirePartner from "@/lib/requirePartner";
import { visibleFor, B2B } from "@/lib/audience";
import { buildRateRows } from "@/lib/rateList";
import { findLiveCourier, isLiveCourierId } from "@/lib/courierRates";
import resolvePartnerPincode from "@/lib/partnerPincode";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const partner = await requirePartner(req, res);
    if (!partner) return;

    const { slug, courier: courierId } = req.query;
    const pincode = await resolvePartnerPincode(partner);

    const category = await Category.findOne({
      slug,
      categoryFor: { $in: visibleFor(B2B) },
    })
      .select("name slug")
      .lean();
    if (!category) return res.status(404).json({ message: "Product group not found" });

    const children = await Category.find({
      parent: category._id,
      categoryFor: { $in: visibleFor(B2B) },
    })
      .select("name")
      .lean();

    // A courier is optional: without one the table quotes goods and GST only.
    // A live Shiprocket courier is looked up by its quote, a saved one by its id.
    let courier = null;
    if (courierId) {
      if (isLiveCourierId(courierId)) {
        courier = await findLiveCourier(courierId, pincode);
      } else if (mongoose.isValidObjectId(courierId)) {
        courier = await RateCourier.findOne({ _id: courierId, isActive: true }).lean();
      }
      if (!courier) {
        return res.status(400).json({ message: "That courier is no longer available. Please pick another." });
      }
    }

    const categoryIds = [category._id, ...children.map((c) => c._id)];
    const products = await Product.find({
      category: { $in: categoryIds },
      status: "published",
      productFor: { $in: visibleFor(B2B) },
      "b2bOptions.enabled": true,
    })
      .select("name slug shortDescription category basePrice salePrice gstPercent minOrderQty pricingTiers attributes b2bOptions shipping")
      .sort({ name: 1 })
      .lean();

    // Sub-categories become the headings on the rate card, which is how the
    // printed card is read: one block per paper or finish
    const nameById = new Map([
      [String(category._id), category.name],
      ...children.map((c) => [String(c._id), c.name]),
    ]);

    const groups = new Map();
    for (const product of products) {
      const groupName = nameById.get(String(product.category)) || category.name;
      const rows = buildRateRows(product, courier);
      if (!rows.length) continue;

      const entry = groups.get(groupName) || { name: groupName, products: [] };
      entry.products.push({
        _id: String(product._id),
        name: product.name,
        slug: product.slug,
        detail: product.shortDescription || "",
        rows,
      });
      groups.set(groupName, entry);
    }

    return res.json({
      category: { name: category.name, slug: category.slug },
      courier: courier ? { _id: String(courier._id), name: courier.name } : null,
      pincode,
      groups: Array.from(groups.values()),
    });
  } catch (err) {
    console.error("Rate list error:", err);
    return res.status(500).json({ message: "Could not load the rate list" });
  }
}
