// pages/api/complaints/index.js
// POST — B2B user submits a complaint
// GET  — B2B user fetches their own complaints

import dbConnect from "@/lib/dbConnect";
import Complaint from "@/models/Complaint";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const getUserFromReq = (req) => {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch { return null; }
};

const uploadFile = (buffer, originalName, folder) => {
  return new Promise((resolve, reject) => {
    const ext = (originalName.split(".").pop() || "").toLowerCase();
    const isImage = ["jpg","jpeg","png","gif","webp"].includes(ext);
    const isVideo = ["mp4","mov","avi","webm"].includes(ext);
    const resourceType = isVideo ? "video" : isImage ? "image" : "raw";

    const sanitized = originalName
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_");
    const publicId = `${folder}/${sanitized}_${Date.now()}`;

    const mime = isVideo ? "video/mp4" : isImage ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/octet-stream";
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    cloudinary.uploader.upload(base64, {
      public_id: publicId, resource_type: resourceType,
      type: "upload", access_mode: "public",
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
  });
};

export default async function handler(req, res) {
  await dbConnect();
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });

  // ── GET: fetch user's complaints ──────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const complaints = await Complaint.find({ user: decoded.id })
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: complaints });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── POST: create complaint ────────────────────────────────────────────────
  if (req.method === "POST") {
    return new Promise((resolve) => {
      upload.any()(req, res, async (err) => {
        if (err) return res.status(500).json({ message: "Upload error" });

        try {
          const { orderId, message } = req.body;
          if (!orderId || !message) {
            return res.status(400).json({ message: "Order ID and message are required" });
          }

          const files = req.files || [];
          const imageFiles = files.filter(f => {
            const ext = f.originalname.split(".").pop().toLowerCase();
            return ["jpg","jpeg","png","gif","webp"].includes(ext);
          }).slice(0, 5); // max 5 images

          const videoFiles = files.filter(f => {
            const ext = f.originalname.split(".").pop().toLowerCase();
            return ["mp4","mov","avi","webm"].includes(ext);
          }).slice(0, 1); // max 1 video

          // Upload images
          const imageUrls = await Promise.all(
            imageFiles.map(f => uploadFile(f.buffer, f.originalname, "complaints/images"))
          );

          // Upload video
          const videoUrl = videoFiles.length > 0
            ? await uploadFile(videoFiles[0].buffer, videoFiles[0].originalname, "complaints/videos")
            : null;

          const complaint = await Complaint.create({
            user:    decoded.id,
            orderId: orderId.trim(),
            message: message.trim(),
            images:  imageUrls,
            video:   videoUrl,
          });

          return res.status(201).json({ success: true, data: complaint });
        } catch (err) {
          console.error("Complaint create error:", err);
          return res.status(500).json({ message: err.message });
        } finally {
          resolve();
        }
      });
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}