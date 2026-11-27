// pages/api/admin/blogs/comments/index.js — comment moderation list.
// GET ?status=pending|approved|rejected&slug= -> { comments, stats }
import dbConnect from "@/lib/dbConnect";
import BlogComment from "@/models/BlogComment";
import { requireAdminPermission } from "@/lib/adminAuth";

const STATUSES = ["pending", "approved", "rejected"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.slug) filter.blogSlug = String(req.query.slug);

    const [comments, grouped] = await Promise.all([
      BlogComment.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
      BlogComment.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const g of grouped) {
      if (g._id in stats) stats[g._id] = g.n;
      stats.total += g.n;
    }
    return res.status(200).json({ comments: comments.map((c) => ({ ...c, id: String(c._id) })), stats });
  } catch (err) {
    console.error("Admin comments error:", err);
    return res.status(500).json({ message: "Could not load comments." });
  }
}
