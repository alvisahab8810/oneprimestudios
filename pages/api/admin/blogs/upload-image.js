// pages/api/admin/blogs/upload-image.js — saves an image inserted into blog content.
// POST { base64: "data:image/...;base64,...", name } -> { url }
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import { saveBlogImage } from "@/lib/blogImages";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  try {
    const { base64, name } = req.body || {};
    const url = saveBlogImage(base64, name);
    return res.status(200).json({ success: true, url });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Could not upload the image." });
  }
}
