// Receives one photo, video or banner image for a managed area of the website
// and stores it on the server under /public/uploads/action, the same way order
// artwork is stored. The database row is created by the sibling index route.
// The area arrives as ?section= because the body itself is a multipart stream.
import fs from "fs";
import path from "path";
import multer from "multer";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  checkMedia,
  mediaKind,
  VIDEO_MAX_BYTES,
  formatBytes,
  isSection,
  DEFAULT_SECTION,
} from "@/lib/actionMediaRules";

const sectionOf = (req) =>
  isSection(req.query?.section) ? req.query.section : DEFAULT_SECTION;

const uploadDir = path.join(process.cwd(), "public", "uploads", "action");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .slice(0, 40);
    cb(null, `${Date.now()}-${base || "media"}${ext}`);
  },
});

const upload = multer({
  storage,
  // The larger of the two caps; the per-kind limit is checked in fileFilter
  limits: { fileSize: VIDEO_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const kind = mediaKind(file.mimetype, file.originalname, sectionOf(req));
    if (!kind) {
      cb(new Error("That kind of file cannot be used here."));
      return;
    }
    cb(null, true);
  },
}).single("file");

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const me = await requireAdminPermission(req, res, "homepage_media");
  if (!me) return;

  try {
    await runUpload(req, res);
  } catch (err) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `That file is larger than the ${formatBytes(VIDEO_MAX_BYTES)} limit.`
        : err.message || "Upload failed";
    return res.status(400).json({ message });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ message: "No file received." });

  // Multer's own cap is the video limit, so an oversized image is only caught
  // once the file is on disk — it is removed again rather than left behind.
  const problem = checkMedia({
    mime: file.mimetype,
    filename: file.originalname,
    size: file.size,
    section: sectionOf(req),
  });

  if (problem) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ message: problem });
  }

  return res.status(200).json({
    success: true,
    type: mediaKind(file.mimetype, file.originalname, sectionOf(req)),
    src: `/uploads/action/${file.filename}`,
    size: file.size,
  });
}

export const config = { api: { bodyParser: false } };
