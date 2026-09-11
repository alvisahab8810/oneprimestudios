// pages/api/public-categories/menu.js
// Header ka dynamic category menu: top-level parents + unke direct children.
// B2B/B2C visibility wahi rule follow karta hai jo /api/public-categories me hai.
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { userType } = req.query;

    const isB2B = userType === "b2b" || userType === "partner";
    const visibleFor = isB2B ? ["b2b", "both"] : ["b2c", "both"];

    const categories = await Category.find({ categoryFor: { $in: visibleFor } })
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

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(menu);
  } catch (err) {
    console.error("public category menu error:", err);
    return res.status(500).json({ message: err.message });
  }
}
