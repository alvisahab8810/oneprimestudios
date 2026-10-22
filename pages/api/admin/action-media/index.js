// Admin listing and creation for the media areas of the website.
import dbConnect from "@/lib/dbConnect";
import ActionMedia, { sectionQuery } from "@/models/ActionMedia";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  isSection,
  DEFAULT_SECTION,
  sectionKind,
  cleanLink,
} from "@/lib/actionMediaRules";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  const section = isSection(req.query.section || req.body?.section)
    ? req.query.section || req.body.section
    : DEFAULT_SECTION;
  const kind = sectionKind(section);

  try {
    if (req.method === "GET") {
      const items = await ActionMedia.find(sectionQuery(section))
        .sort({ order: 1, createdAt: 1 })
        .lean();

      return res.json({ items });
    }

    const { type, src, alt, size, tag, title, description, link } = req.body || {};

    const linkValue = cleanLink(link);
    if (linkValue === null) {
      return res.status(400).json({ message: "The link has to be a page on this website, such as /products." });
    }

    const fields = {
      section,
      alt: String(alt || "").trim().slice(0, 160),
      tag: String(tag || "").trim().slice(0, 60),
      title: String(title || "").trim().slice(0, 120),
      description: String(description || "").trim().slice(0, 300),
      link: linkValue,
    };

    if (kind === "text") {
      if (!fields.title) {
        return res.status(400).json({ message: "A notice needs a heading." });
      }
      fields.type = "text";
      fields.src = "";
      fields.size = 0;
    } else {
      const allowed = kind === "banner" ? ["image"] : ["image", "video"];
      if (!allowed.includes(type)) {
        return res.status(400).json({ message: "Unknown media type." });
      }

      // Only the path this server handed back on upload is accepted, so a row
      // can never be pointed at an arbitrary URL.
      if (typeof src !== "string" || !/^\/uploads\/action\/[\w.-]+$/.test(src)) {
        return res.status(400).json({ message: "Invalid file path." });
      }

      fields.type = type;
      fields.src = src;
      fields.size = Number(size) || 0;
    }

    // New items go to the end of their own section
    const last = await ActionMedia.findOne(sectionQuery(section)).sort({ order: -1 }).lean();

    const item = await ActionMedia.create({
      ...fields,
      order: (last?.order ?? -1) + 1,
      isActive: true,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error("Action media error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
