// Product groups shown on the partner rate list. Only categories that actually
// hold a B2B product are listed, so no card leads to an empty rate card.
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import Product from "@/models/Product";
import requirePartner from "@/lib/requirePartner";
import { visibleFor, B2B } from "@/lib/audience";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const partner = await requirePartner(req, res);
    if (!partner) return;

    const categories = await Category.find({ categoryFor: { $in: visibleFor(B2B) } })
      .select("name slug image parent")
      .sort({ name: 1 })
      .lean();

    const productCategoryIds = await Product.distinct("category", {
      status: "published",
      productFor: { $in: visibleFor(B2B) },
      "b2bOptions.enabled": true,
    });
    const withProducts = new Set(productCategoryIds.map(String));

    // A parent card is worth showing when the parent itself or any of its
    // children has a product
    const childrenOf = new Map();
    for (const cat of categories) {
      if (!cat.parent) continue;
      const key = String(cat.parent);
      childrenOf.set(key, [...(childrenOf.get(key) || []), cat]);
    }

    const parents = categories.filter((c) => !c.parent);
    const list = parents
      .filter((parentCat) => {
        const id = String(parentCat._id);
        if (withProducts.has(id)) return true;
        return (childrenOf.get(id) || []).some((child) => withProducts.has(String(child._id)));
      })
      .map((c) => ({ _id: String(c._id), name: c.name, slug: c.slug, image: c.image || "" }));

    return res.json(list);
  } catch (err) {
    console.error("Rate list categories error:", err);
    return res.status(500).json({ message: "Could not load the rate list" });
  }
}
