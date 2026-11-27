// pages/api/admin/payment-accounts/upload-qr.js
// Stores one QR code picture under /public/uploads/payment-qr and returns its
// path. The account itself is saved by the sibling routes.
import fs from "fs";
import path from "path";
import multer from "multer";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const EXT = [".png", ".jpg", ".jpeg", ".webp"];
const MIME = ["image/png", "image/jpeg", "image/webp"];

const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-qr");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-qr${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT.includes(ext) || (file.mimetype && !MIME.includes(file.mimetype))) {
      cb(new Error("The QR code has to be a PNG, JPG or WebP picture."));
      return;
    }
    cb(null, true);
  },
}).single("file");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();
  const me = await requireAdminPermission(req, res, "wallet");
  if (!me) return;

  try {
    await new Promise((resolve, reject) => upload(req, res, (err) => (err ? reject(err) : resolve())));
  } catch (err) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "The QR picture must be 2 MB or smaller." : err.message || "Upload failed";
    return res.status(400).json({ message });
  }

  if (!req.file) return res.status(400).json({ message: "No file received." });
  return res.status(200).json({ success: true, src: `/uploads/payment-qr/${req.file.filename}` });
}

export const config = { api: { bodyParser: false } };
