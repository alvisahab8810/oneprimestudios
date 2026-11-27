// pages/api/admin/blogs/index.js — admin blog list and create.
import dbConnect from "@/lib/dbConnect";
import Blog from "@/models/Blog";
import { requireAdminPermission } from "@/lib/adminAuth";
import { buildBlogData } from "@/lib/blogInput";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  try {
    if (req.method === "GET") {
      const blogs = await Blog.find({})
        .select("title slug status cardImage coverImage categories authorName views publishDate createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ blogs: blogs.map((b) => ({ ...b, id: String(b._id) })) });
    }

    if (req.method === "POST") {
      const { data, error } = buildBlogData(req.body);
      if (error) return res.status(400).json({ message: error });
      if (await Blog.exists({ slug: data.slug })) {
        return res.status(409).json({ message: "Another blog already uses this slug." });
      }
      const blog = await Blog.create(data);
      return res.status(201).json({ success: true, blog: { ...blog.toObject(), id: String(blog._id) } });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Admin blogs error:", err);
    if (err?.code === 11000) return res.status(409).json({ message: "Another blog already uses this slug." });
    return res.status(500).json({ message: "Could not save the blog." });
  }
}
