// pages/api/admin/blogs/comments/[id].js — approve/reject or delete one comment.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import BlogComment from "@/models/BlogComment";
import { requireAdminPermission } from "@/lib/adminAuth";

const STATUSES = ["pending", "approved", "rejected"];

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid comment id." });

  try {
    if (req.method === "PATCH") {
      const { status } = req.body || {};
      if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });
      const comment = await BlogComment.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
      if (!comment) return res.status(404).json({ message: "Comment not found." });
      return res.status(200).json({ success: true, comment: { ...comment, id: String(comment._id) } });
    }

    if (req.method === "DELETE") {
      const comment = await BlogComment.findByIdAndDelete(id).lean();
      if (!comment) return res.status(404).json({ message: "Comment not found." });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Admin comment error:", err);
    return res.status(500).json({ message: "Could not update the comment." });
  }
}
