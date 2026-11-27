// pages/api/blogs/index.js — public list of published blogs.
// GET ?search=&category=&tag=&page=1&limit=9
import dbConnect from "@/lib/dbConnect";
import Blog from "@/models/Blog";

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { search = "", category = "", tag = "" } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));

    const filter = { status: "published" };
    const q = String(search).trim();
    if (q) {
      const re = new RegExp(escapeRe(q), "i");
      filter.$or = [{ title: re }, { summary: re }];
    }
    if (category) filter.categories = new RegExp(`^${escapeRe(category)}$`, "i");
    if (tag) filter.tags = new RegExp(`^${escapeRe(tag)}$`, "i");

    const [blogs, total, categories] = await Promise.all([
      Blog.find(filter)
        .select("-content -schema -schemas -faqs")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
      Blog.distinct("categories", { status: "published" }),
    ]);

    return res.status(200).json({
      blogs: blogs.map((b) => ({ ...b, id: String(b._id) })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      categories: categories.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("Public blogs error:", err);
    return res.status(500).json({ message: "Could not load blogs." });
  }
}
