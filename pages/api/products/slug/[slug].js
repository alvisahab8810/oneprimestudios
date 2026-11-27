import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { resolveAudience, visibleFor, isAdminRequest, B2C } from "@/lib/audience";
import { getLiveDealMap } from "@/lib/flashSale";
import { flashAppliesTo } from "@/lib/flashPricing";

export default async function handler(req, res) {
  await dbConnect();

  const { slug } = req.query;

  try {
    const product = await Product.findOne({ slug }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    // A direct link must not open a product the visitor's side cannot buy, and
    // a draft must stay hidden. The admin panel is exempt so it can preview.
    let flashDeal = null;
    if (!isAdminRequest(req)) {
      const audience = resolveAudience(req, req.query.userType);
      const allowed = visibleFor(audience);
      const belongsToAudience = allowed.includes(product.productFor || "both");
      if (product.status !== "published" || !belongsToAudience) {
        return res.status(404).json({ message: "Product not found" });
      }

      // A running flash sale, for retail shoppers only. The page applies the
      // deal price itself; the cart works it out again on the server.
      if (audience === B2C && flashAppliesTo(product, null)) {
        const deal = (await getLiveDealMap([product._id])).get(String(product._id));
        if (deal) flashDeal = { ...deal, serverNow: new Date().toISOString() };
      }
    }

    res.status(200).json(flashDeal ? { ...product, flashDeal } : product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
