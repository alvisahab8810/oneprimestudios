// Admin listing and creation for the homepage "See it in Action" slider.
import dbConnect from "@/lib/dbConnect";
import ActionMedia from "@/models/ActionMedia";
import { requireAdminPermission } from "@/lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  try {
    if (req.method === "GET") {
      const items = await ActionMedia.find({})
        .sort({ order: 1, createdAt: 1 })
        .lean();

      return res.json({ items });
    }

    const { type, src, alt, size } = req.body || {};

    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Unknown media type." });
    }

    // Only the path this server handed back on upload is accepted, so a row
    // can never be pointed at an arbitrary URL.
    if (typeof src !== "string" || !/^\/uploads\/action\/[\w.-]+$/.test(src)) {
      return res.status(400).json({ message: "Invalid file path." });
    }

    // New items go to the end of the slider
    const last = await ActionMedia.findOne({}).sort({ order: -1 }).lean();

    const item = await ActionMedia.create({
      type,
      src,
      alt: String(alt || "").trim().slice(0, 160),
      size: Number(size) || 0,
      order: (last?.order ?? -1) + 1,
      isActive: true,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error("Action media error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
