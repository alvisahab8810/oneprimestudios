// pages/api/public-categories/menu.js
// The header's dynamic category menu: top-level parents plus their direct
// children. B2B/B2C visibility follows the same rule as /api/public-categories.
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import { resolveAudience, visibleFor } from "@/lib/audience";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // The login cookie decides; ?userType= only applies to logged-out visitors
    const audience = resolveAudience(req, req.query.userType);

    const categories = await Category.find({ categoryFor: { $in: visibleFor(audience) } })
      .select("_id name slug parent image")
      .sort({ name: 1 })
      .lean();

    const parents = categories.filter((c) => !c.parent);

    const menu = parents.map((parent) => ({
      _id: String(parent._id),
      name: parent.name,
      slug: parent.slug,
      image: parent.image || "",
      children: categories
        .filter((c) => String(c.parent) === String(parent._id))
        .map((child) => ({
          _id: String(child._id),
          name: child.name,
          slug: child.slug,
          image: child.image || "",
        })),
    }));

    // The menu differs per visitor, so a shared cache must never hold it —
    // otherwise a partner can be served the retail menu, or the other way round
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json(menu);
  } catch (err) {
    console.error("public category menu error:", err);
    return res.status(500).json({ message: err.message });
  }
}
