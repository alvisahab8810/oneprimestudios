// Puts the three photos that ship with the website into the slider list, so an
// admin can reorder, hide or delete them like anything they upload themselves.
// Running it twice adds nothing new.
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import ActionMedia from "@/models/ActionMedia";
import { requireAdminPermission } from "@/lib/adminAuth";

// Bundled file -> the copy this route creates under /public/uploads/action
const DEFAULTS = [
  {
    bundled: "item.webp",
    file: "default-screen-printing.webp",
    alt: "Screen printing in action",
  },
  {
    bundled: "item1.webp",
    file: "default-offset-press.webp",
    alt: "Offset press run",
  },
  {
    bundled: "item2.webp",
    file: "default-finishing.webp",
    alt: "Finishing and binding",
  },
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  try {
    const sourceDir = path.join(
      process.cwd(),
      "public",
      "assets",
      "images",
      "action"
    );
    const uploadDir = path.join(process.cwd(), "public", "uploads", "action");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const last = await ActionMedia.findOne({}).sort({ order: -1 }).lean();
    let order = (last?.order ?? -1) + 1;

    let added = 0;
    let skipped = 0;
    const missing = [];

    for (const entry of DEFAULTS) {
      const src = `/uploads/action/${entry.file}`;

      // Already listed, whether live or hidden — leave the admin's copy alone
      const exists = await ActionMedia.findOne({ src }).lean();
      if (exists) {
        skipped += 1;
        continue;
      }

      const from = path.join(sourceDir, entry.bundled);
      if (!fs.existsSync(from)) {
        missing.push(entry.bundled);
        continue;
      }

      const to = path.join(uploadDir, entry.file);
      if (!fs.existsSync(to)) fs.copyFileSync(from, to);

      await ActionMedia.create({
        type: "image",
        src,
        alt: entry.alt,
        size: fs.statSync(to).size,
        order: order++,
        isActive: true,
      });

      added += 1;
    }

    const parts = [];
    if (added) parts.push(`${added} photo${added > 1 ? "s" : ""} added`);
    if (skipped) parts.push(`${skipped} already in the list`);
    if (missing.length) parts.push(`${missing.length} file not found on server`);

    return res.json({
      success: true,
      added,
      skipped,
      message: parts.join(", ") || "Nothing to add.",
    });
  } catch (err) {
    console.error("Action media defaults error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
