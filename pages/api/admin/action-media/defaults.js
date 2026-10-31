// Puts the content that ships with the website into a section's list, so an
// admin can reorder, hide or delete it like anything they add themselves.
// Running it twice adds nothing new.
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import ActionMedia, { sectionQuery } from "@/models/ActionMedia";
import { requireAdminPermission } from "@/lib/adminAuth";
import { isSection, DEFAULT_SECTION } from "@/lib/actionMediaRules";

// Bundled file -> the copy this route creates under /public/uploads/action
const DEFAULTS = {
  action: [
    {
      bundled: ["action", "item.webp"],
      file: "default-screen-printing.webp",
      alt: "Screen printing in action",
    },
    {
      bundled: ["action", "item1.webp"],
      file: "default-offset-press.webp",
      alt: "Offset press run",
    },
    {
      bundled: ["action", "item2.webp"],
      file: "default-finishing.webp",
      alt: "Finishing and binding",
    },
  ],
  "hero-desktop": [
    {
      bundled: ["hero", "banner.webp"],
      file: "default-home-banner.webp",
      alt: "Custom printing and corporate gifting solutions",
      link: "/products",
    },
  ],
  "hero-mobile": [
    {
      bundled: ["hero", "banner-mobile.png"],
      file: "default-home-banner-mobile.png",
      alt: "Custom printing and corporate gifting solutions",
      link: "/products",
    },
  ],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  const section = isSection(req.query.section || req.body?.section)
    ? req.query.section || req.body.section
    : DEFAULT_SECTION;

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "action");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const last = await ActionMedia.findOne(sectionQuery(section))
      .sort({ order: -1 })
      .lean();
    let order = (last?.order ?? -1) + 1;

    let added = 0;
    let skipped = 0;
    const missing = [];

    for (const entry of DEFAULTS[section] || []) {
      const src = `/uploads/action/${entry.file}`;

      // Already listed, whether live or hidden — leave the admin's copy alone
      const exists = await ActionMedia.findOne({ src }).lean();
      if (exists) {
        skipped += 1;
        continue;
      }

      const from = path.join(
        process.cwd(),
        "public",
        "assets",
        "images",
        ...entry.bundled
      );
      if (!fs.existsSync(from)) {
        missing.push(entry.bundled[entry.bundled.length - 1]);
        continue;
      }

      const to = path.join(uploadDir, entry.file);
      if (!fs.existsSync(to)) fs.copyFileSync(from, to);

      await ActionMedia.create({
        section,
        type: "image",
        src,
        alt: entry.alt,
        link: entry.link || "",
        size: fs.statSync(to).size,
        order: order++,
        isActive: true,
      });

      added += 1;
    }

    const parts = [];
    if (added) parts.push(`${added} item${added > 1 ? "s" : ""} added`);
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
