// pages/api/admin/products/option-images.js
// POST multipart "images" (up to 8 files) → { images: ["/uploads/products/..."] }
// Uploads the photos for one attribute option (for example the "Red" colour)
// from the add / edit product screens. The product form then saves the
// returned paths inside attributes[].values[].images.
import nextConnect from "next-connect";
import multer from "multer";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";

const uploadDir = path.join(process.cwd(), "public/uploads/products");
const MAX_FILES = 8;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per photo
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").replace(/[^\w.\-]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP, GIF or AVIF images can be uploaded"));
  },
});

const handler = nextConnect({
  onError(err, req, res) {
    console.error("Option image upload error:", err);
    const tooBig = err?.code === "LIMIT_FILE_SIZE";
    const tooMany = err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE";
    res.status(400).json({
      message: tooBig
        ? "Each image must be 5 MB or smaller"
        : tooMany
        ? `Upload up to ${MAX_FILES} images at a time`
        : err?.message || "Could not upload the images",
    });
  },
  onNoMatch(req, res) {
    res.setHeader("Allow", "POST");
    res.status(405).json({ message: "Method not allowed" });
  },
});

// Check the admin before any file touches the disk
handler.use(async (req, res, next) => {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "products");
  if (!admin) return;
  next();
});

handler.post(upload.array("images", MAX_FILES), (req, res) => {
  const images = (req.files || []).map((f) => `/uploads/products/${f.filename}`);
  if (!images.length) return res.status(400).json({ message: "Choose at least one image" });
  return res.status(200).json({ images });
});

export const config = { api: { bodyParser: false } };
export default handler;
