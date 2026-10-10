// pages/api/public-categories/index.js
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import { resolveAudience, visibleFor } from "@/lib/audience";

export default async function handler(req, res) {
  await dbConnect();

  try {
    // Each side sees its own categories plus the ones marked "both".
    // The login cookie decides; ?userType= only applies to logged-out visitors.
    const audience = resolveAudience(req, req.query.userType);
    const filter = { categoryFor: { $in: visibleFor(audience) } };

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json(categories);
  } catch (err) {
    console.error("public categories error:", err);
    return res.status(500).json({ message: err.message });
  }
}
