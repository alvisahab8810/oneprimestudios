// Edit, reorder, hide or delete one managed slide.
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import ActionMedia from "@/models/ActionMedia";
import { requireAdminPermission } from "@/lib/adminAuth";
import { cleanLink } from "@/lib/actionMediaRules";

export default async function handler(req, res) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const item = await ActionMedia.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (req.method === "DELETE") {
      // The row goes either way; a file that cannot be removed is only logged,
      // because leaving the row behind would show a broken slide on the site.
      // A notice is words only, so there is nothing on disk to remove
      if (item.src) {
        const onDisk = path.join(process.cwd(), "public", item.src);
        fs.unlink(onDisk, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error("Action media file not removed:", err.message);
          }
        });
      }

      await item.deleteOne();
      return res.json({ success: true, message: "Item deleted." });
    }

    const { alt, isActive, order, tag, title, description, link } = req.body || {};

    if (alt !== undefined) item.alt = String(alt).trim().slice(0, 160);
    if (tag !== undefined) item.tag = String(tag).trim().slice(0, 60);
    if (title !== undefined) item.title = String(title).trim().slice(0, 120);
    if (description !== undefined) {
      item.description = String(description).trim().slice(0, 300);
    }
    if (link !== undefined) {
      const linkValue = cleanLink(link);
      if (linkValue === null) {
        return res.status(400).json({
          message: "The link has to be a page on this website, such as /products.",
        });
      }
      item.link = linkValue;
    }
    if (isActive !== undefined) item.isActive = !!isActive;
    if (order !== undefined && Number.isFinite(Number(order))) {
      item.order = Number(order);
    }

    await item.save();
    return res.json({ success: true, item, message: "Saved." });
  } catch (err) {
    console.error("Action media error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
