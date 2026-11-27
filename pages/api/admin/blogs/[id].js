// pages/api/admin/blogs/[id].js — read, update or delete one blog.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/models/Blog";
import BlogComment from "@/models/BlogComment";
import { requireAdminPermission } from "@/lib/adminAuth";
import { buildBlogData } from "@/lib/blogInput";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid blog id." });

  try {
    if (req.method === "GET") {
      const blog = await Blog.findById(id).lean();
      if (!blog) return res.status(404).json({ message: "Blog not found." });
      return res.status(200).json({ blog: { ...blog, id: String(blog._id) } });
    }

    if (req.method === "PUT") {
      const { data, error } = buildBlogData(req.body);
      if (error) return res.status(400).json({ message: error });
      if (await Blog.exists({ slug: data.slug, _id: { $ne: id } })) {
        return res.status(409).json({ message: "Another blog already uses this slug." });
      }
      const before = await Blog.findById(id).select("slug").lean();
      if (!before) return res.status(404).json({ message: "Blog not found." });

      const blog = await Blog.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
      // Keep comments attached when the slug changes
      if (before.slug !== data.slug) {
        await BlogComment.updateMany({ blogSlug: before.slug }, { $set: { blogSlug: data.slug, blogTitle: data.title } });
      }
      return res.status(200).json({ success: true, blog: { ...blog, id: String(blog._id) } });
    }

    if (req.method === "DELETE") {
      const blog = await Blog.findByIdAndDelete(id).lean();
      if (!blog) return res.status(404).json({ message: "Blog not found." });
      await BlogComment.deleteMany({ blogSlug: blog.slug });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Admin blog error:", err);
    if (err?.code === 11000) return res.status(409).json({ message: "Another blog already uses this slug." });
    return res.status(500).json({ message: "Could not process the blog." });
  }
}
