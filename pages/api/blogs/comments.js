// pages/api/blogs/comments.js — public blog comments.
// GET ?slug=  -> approved comments for a post
// POST { slug, name, email, body } -> saved as pending until an admin approves it
import dbConnect from "@/lib/dbConnect";
import Blog from "@/models/Blog";
import BlogComment from "@/models/BlogComment";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === "GET") {
      const slug = String(req.query.slug || "").trim();
      if (!slug) return res.status(400).json({ message: "slug is required" });
      const comments = await BlogComment.find({ blogSlug: slug, status: "approved" })
        .select("name body createdAt")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return res.status(200).json({ comments });
    }

    if (req.method === "POST") {
      const { slug, name, email, body } = req.body || {};
      const cleanName = String(name || "").trim().slice(0, 80);
      const cleanEmail = String(email || "").trim().slice(0, 120);
      const cleanBody = String(body || "").trim().slice(0, 3000);
      if (!cleanName || !cleanEmail || !cleanBody) {
        return res.status(400).json({ message: "Name, email and comment are required." });
      }
      if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ message: "Enter a valid email address." });

      const blog = await Blog.findOne({ slug: String(slug || ""), status: "published" })
        .select("title slug allowComments")
        .lean();
      if (!blog) return res.status(404).json({ message: "Blog not found." });
      if (blog.allowComments === false) return res.status(403).json({ message: "Comments are closed for this post." });

      await BlogComment.create({
        blogSlug: blog.slug,
        blogTitle: blog.title,
        name: cleanName,
        email: cleanEmail,
        body: cleanBody,
      });
      return res.status(201).json({ success: true, message: "Thanks! Your comment will appear after review." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Blog comments error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
