// models/BlogComment.js — reader comments on blog posts. New comments wait for approval.
import mongoose from "mongoose";

const BlogCommentSchema = new mongoose.Schema(
  {
    blogSlug: { type: String, required: true, index: true },
    blogTitle: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    body: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.BlogComment || mongoose.model("BlogComment", BlogCommentSchema);
