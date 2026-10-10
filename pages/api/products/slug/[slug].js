import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { resolveAudience, visibleFor, isAdminRequest } from "@/lib/audience";

export default async function handler(req, res) {
  await dbConnect();

  const { slug } = req.query;

  try {
    const product = await Product.findOne({ slug }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    // A direct link must not open a product the visitor's side cannot buy, and
    // a draft must stay hidden. The admin panel is exempt so it can preview.
    if (!isAdminRequest(req)) {
      const audience = resolveAudience(req, req.query.userType);
      const allowed = visibleFor(audience);
      const belongsToAudience = allowed.includes(product.productFor || "both");
      if (product.status !== "published" || !belongsToAudience) {
        return res.status(404).json({ message: "Product not found" });
      }
    }

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
