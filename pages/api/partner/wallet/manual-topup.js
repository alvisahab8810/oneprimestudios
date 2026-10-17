// Manual (bank transfer) wallet top-up for partners.
// GET  — the partner's own requests and their status
// POST — raise a new request with the bank reference and an optional screenshot
// The online QR flow is untouched; nothing here credits a wallet. Only an
// admin approval does that.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import WalletTopupRequest from "@/models/WalletTopupRequest";
import {
  MANUAL_TOPUP_MODES,
  MANUAL_TOPUP_MIN,
  MANUAL_TOPUP_MAX,
} from "@/config/bankDetails";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB is plenty for a screenshot
});

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "pdf"];

const uploadProof = (buffer, originalName) =>
  new Promise((resolve, reject) => {
    const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
    const sanitized = originalName
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_");
    const isPdf = ext === "pdf";
    const mime = isPdf ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    cloudinary.uploader.upload(
      base64,
      {
        public_id: `wallet-topups/${sanitized}_${Date.now()}`,
        resource_type: isPdf ? "raw" : "image",
        type: "upload",
        access_mode: "public",
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
  });

export default async function handler(req, res) {
  await dbConnect();

  // Per-partner data must never sit in a shared cache
  res.setHeader("Cache-Control", "private, no-store");

  const partner = await getUserFromToken(req);
  if (!partner) {
    return res.status(401).json({ message: "Please sign in to continue" });
  }
  if (partner.userType !== "partner") {
    return res.status(403).json({ message: "Wallet top-up is available to partners only" });
  }

  /* ── GET: this partner's own requests ──────────────────────────────── */
  if (req.method === "GET") {
    try {
      const requests = await WalletTopupRequest.find({ user: partner._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("-reviewedBy")
        .lean();

      return res.status(200).json({ requests });
    } catch (err) {
      console.error("Manual top-up list error:", err);
      return res.status(500).json({ message: "Could not load your requests" });
    }
  }

  /* ── POST: raise a new request ─────────────────────────────────────── */
  if (req.method === "POST") {
    return new Promise((resolve) => {
      upload.any()(req, res, async (uploadErr) => {
        if (uploadErr) {
          res.status(400).json({
            message: uploadErr.message || "Could not read the uploaded file",
          });
          return resolve();
        }

        try {
          const amount = Number(req.body.amount);
          const paymentMode = String(req.body.paymentMode || "").trim();
          const referenceNumber = String(req.body.referenceNumber || "").trim();
          const note = String(req.body.note || "").trim().slice(0, 500);
          const paidAtRaw = String(req.body.paidAt || "").trim();

          if (!Number.isFinite(amount) || amount < MANUAL_TOPUP_MIN) {
            res.status(400).json({
              message: `Enter an amount of at least ₹${MANUAL_TOPUP_MIN}`,
            });
            return resolve();
          }
          if (amount > MANUAL_TOPUP_MAX) {
            res.status(400).json({
              message: `A single request cannot be more than ₹${MANUAL_TOPUP_MAX}. Please split it.`,
            });
            return resolve();
          }
          if (!MANUAL_TOPUP_MODES.includes(paymentMode)) {
            res.status(400).json({ message: "Please choose how you paid" });
            return resolve();
          }
          if (referenceNumber.length < 4) {
            res.status(400).json({
              message: "Enter the UTR / reference number from your bank",
            });
            return resolve();
          }

          // A request still waiting on an admin with the same reference is
          // almost always a double submit
          const duplicate = await WalletTopupRequest.findOne({
            user: partner._id,
            referenceNumber,
          }).lean();
          if (duplicate) {
            res.status(409).json({
              message: `This reference was already submitted (${duplicate.requestNumber}, ${duplicate.status})`,
            });
            return resolve();
          }

          let screenshotUrl = "";
          const file = (req.files || []).find((f) =>
            IMAGE_EXTS.includes((f.originalname.split(".").pop() || "").toLowerCase())
          );
          if (file) {
            screenshotUrl = await uploadProof(file.buffer, file.originalname);
          }

          const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;

          const request = await WalletTopupRequest.create({
            user: partner._id,
            amount,
            paymentMode,
            referenceNumber,
            paidAt: paidAt && !isNaN(paidAt.getTime()) ? paidAt : null,
            screenshotUrl,
            note,
            status: "pending",
          });

          res.status(201).json({
            message:
              "Request submitted. Your wallet will be credited once our team verifies the payment.",
            request,
          });
          return resolve();
        } catch (err) {
          if (err?.code === 11000) {
            res.status(409).json({
              message: "This reference number has already been submitted",
            });
            return resolve();
          }
          console.error("Manual top-up create error:", err);
          res.status(500).json({ message: "Could not submit your request" });
          return resolve();
        }
      });
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
