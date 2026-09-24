// pages/api/returns/index.js
// GET  — customer fetches their own return/refund requests (optional ?orderId=)
// POST — customer raises a return/refund request with photos of the fault
// Returns are a B2C-only feature; partner (B2B) orders are rejected here.

import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import ReturnRequest from "@/models/ReturnRequest";
import { checkReturnEligibility, OPEN_RETURN_STATUSES, RETURN_REASONS } from "@/lib/returnRules";
import jwt from "jsonwebtoken";
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per photo
});

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "heic"];

const getUserFromReq = (req) => {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const uploadImage = (buffer, originalName) =>
  new Promise((resolve, reject) => {
    const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
    const sanitized = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/_+/g, "_");
    const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    cloudinary.uploader.upload(
      base64,
      {
        public_id: `returns/${sanitized}_${Date.now()}`,
        resource_type: "image",
        type: "upload",
        access_mode: "public",
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
  });

export default async function handler(req, res) {
  await dbConnect();

  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });

  /* ── GET: this customer's requests ─────────────────────────────────────── */
  if (req.method === "GET") {
    try {
      const filter = { user: decoded.id };
      if (req.query.orderId) filter.order = req.query.orderId;

      const requests = await ReturnRequest.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({ success: true, data: requests });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  /* ── POST: raise a new request ─────────────────────────────────────────── */
  if (req.method === "POST") {
    return new Promise((resolve) => {
      upload.any()(req, res, async (uploadErr) => {
        if (uploadErr) {
          res.status(400).json({ message: uploadErr.message || "Could not read the uploaded photos" });
          return resolve();
        }

        try {
          const orderId = String(req.body.orderId || "").trim();
          const reason = String(req.body.reason || "").trim();
          const description = String(req.body.description || "").trim();
          const type = req.body.type === "refund" ? "refund" : "return";

          if (!orderId) {
            res.status(400).json({ message: "Order is required" });
            return resolve();
          }
          if (!reason || !RETURN_REASONS.includes(reason)) {
            res.status(400).json({ message: "Please choose a valid reason" });
            return resolve();
          }

          const [order, user] = await Promise.all([
            Order.findOne({ _id: orderId, user: decoded.id }).lean(),
            User.findById(decoded.id).select("userType").lean(),
          ]);

          // Eligibility is re-checked on the server — the UI hint is not enough
          const problem = checkReturnEligibility(order, user);
          if (problem) {
            res.status(400).json({ message: problem });
            return resolve();
          }

          const existing = await ReturnRequest.findOne({
            order: orderId,
            status: { $in: OPEN_RETURN_STATUSES },
          }).lean();
          if (existing) {
            res.status(400).json({
              message: `A request (${existing.requestNumber}) is already open for this order`,
            });
            return resolve();
          }

          const photos = (req.files || [])
            .filter((f) => IMAGE_EXTS.includes((f.originalname.split(".").pop() || "").toLowerCase()))
            .slice(0, 5);

          if (!photos.length) {
            res.status(400).json({ message: "Please attach at least one photo of the issue" });
            return resolve();
          }

          const images = await Promise.all(
            photos.map((f) => uploadImage(f.buffer, f.originalname))
          );

          const request = await ReturnRequest.create({
            user: decoded.id,
            order: order._id,
            orderNumber: order.orderNumber || "",
            type,
            reason,
            description,
            images,
            status: "Requested",
            refund: { amount: Number(order.total) || 0 },
            history: [{ status: "Requested", remarks: reason, by: "customer", at: new Date() }],
          });

          await Order.updateOne({ _id: order._id }, { $set: { returnStatus: "Requested" } });

          res.status(201).json({ success: true, data: request });
          return resolve();
        } catch (err) {
          console.error("Return request create error:", err);
          res.status(500).json({ message: err.message });
          return resolve();
        }
      });
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
