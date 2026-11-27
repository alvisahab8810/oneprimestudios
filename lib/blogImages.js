// lib/blogImages.js — server-only helpers for blog images.
// The blog editor sends images as base64 data URIs; they are saved under
// public/uploads/blogs and replaced by their public URL.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "blogs");
const MAX_BYTES = 6 * 1024 * 1024;
const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function safeBase(name) {
  const base = String(name || "image")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "image";
}

// Saves a data URI and returns "/uploads/blogs/<file>". Throws on bad input.
export function saveBlogImage(dataUri, name) {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(String(dataUri || ""));
  if (!match) throw new Error("Image must be a base64 data URI.");
  const mime = match[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Image is empty.");
  if (buffer.length > MAX_BYTES) throw new Error("Image must be 6 MB or smaller.");

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${safeBase(name)}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buffer);
  return `/uploads/blogs/${file}`;
}

// For cover/card images: saves a new base64 image, keeps an existing URL as is.
export function resolveImageField(img, fallbackName) {
  if (!img || typeof img !== "object") return { src: "", alt: "" };
  const alt = String(img.alt || "").slice(0, 200);
  let src = String(img.src || "");
  if (src.startsWith("data:")) src = saveBlogImage(src, img.name || fallbackName);
  return { src, alt };
}
