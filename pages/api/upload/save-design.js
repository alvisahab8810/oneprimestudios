// pages/api/upload/save-design.js
// CHANGES:
//   1. Files now upload to Cloudinary instead of VPS disk
//      (admin product images stay on disk — only customer design files move to Cloudinary)
//   2. DesignUpload DB record now saves the Cloudinary URL (secure_url)
//   3. All other logic (JWT auth, attrMap, GET endpoint) unchanged
//
// SETUP: Add to .env.local:
//   CLOUDINARY_CLOUD_NAME=xxx
//   CLOUDINARY_API_KEY=xxx
//   CLOUDINARY_API_SECRET=xxx

import dbConnect from "@/lib/dbConnect";
import DesignUpload from "@/models/DesignUpload";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export const config = {
  api: { bodyParser: false },
};

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Upload buffer to Cloudinary ───────────────────────────────────────────────
const uploadToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const ext = (originalName.split(".").pop() || "").toLowerCase();

    // resource_type:
    //   "image" → png, jpg, gif, webp
    //   "raw"   → pdf, cdr, and any non-image/video file
    const resourceType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
      ? "image"
      : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "designs",          // stored under /designs in your Cloudinary account
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ── Multer: memory storage (no disk write) ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max — protects server
});

export default async function handler(req, res) {
  await dbConnect();

  switch (req.method) {
    case "POST": return handleFileUpload(req, res);
    case "GET":  return handleGet(req, res);
    default:     return res.status(405).json({ message: "Method not allowed" });
  }
}

// ── POST — upload files to Cloudinary + save URL to DB ───────────────────────
async function handleFileUpload(req, res) {
  try {
    upload.any()(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(500).json({ message: "File upload failed" });
      }

      try {
        // Auth
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "No token provided" });
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { productId } = req.body;

        const attrMap = (() => {
          try { return req.body?.attrMap ? JSON.parse(req.body.attrMap) : {}; }
          catch { return {}; }
        })();

        if (req.files && req.files.length > 0) {
          // Upload each file to Cloudinary, then save URL to DB
          const saved = await Promise.all(
            req.files.map(async (file) => {
              // Upload buffer → Cloudinary
              const cloudResult = await uploadToCloudinary(
                file.buffer,
                file.originalname
              );

              const fileUrl  = cloudResult.secure_url;  // Cloudinary CDN URL
              const fileName = file.originalname;
              const attributeKey  = file.fieldname;
              const attributeName = attrMap[attributeKey] || attributeKey;

              // Save to DB — stores Cloudinary URL, not local path
              const savedDoc = await DesignUpload.create({
                user:          userId,
                product:       productId,
                fileName,
                fileUrl,        // ← Cloudinary URL
                attribute:      attributeKey,
                attributeName,
              });

              return savedDoc;
            })
          );

          return res.status(200).json({ success: true, data: saved, message: "Files uploaded" });
        }

        // JSON metadata fallback (unchanged)
        let { files } = req.body;
        if (files) {
          try { files = JSON.parse(files); } catch { /* already parsed */ }

          const savedFiles = await Promise.all(
            files.map(async (file) => {
              const fileUrl  = file.url && file.url !== "undefined"
                ? file.url
                : `/uploads/orders/${file.name || "unknown-file"}`;
              const fileName = file.name || fileUrl.split("/").pop() || "Unnamed file";
              const attribute = file.attribute || file.fieldname || null;

              return await DesignUpload.create({ user: userId, product: productId, fileUrl, fileName, attribute });
            })
          );

          return res.status(200).json({ success: true, data: savedFiles, message: "Files saved" });
        }

        return res.status(400).json({ message: "No file or files provided" });

      } catch (err) {
        console.error("Save design error:", err);
        return res.status(500).json({ message: err.message || "Internal server error" });
      }
    });
  } catch (err) {
    console.error("Upload outer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ── GET — fetch uploaded designs (unchanged) ──────────────────────────────────
async function handleGet(req, res) {
  try {
    const { productId, userId, orderId } = req.query;

    if (!productId) return res.status(400).json({ message: "Missing productId in query" });

    const query = { product: new mongoose.Types.ObjectId(productId) };
    if (userId) query.user  = new mongoose.Types.ObjectId(userId);
    if (orderId) query.order = new mongoose.Types.ObjectId(orderId);

    const designs = await DesignUpload.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: designs });
  } catch (err) {
    console.error("Get design error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}













  // // pages/api/upload/save-design.js
  // import dbConnect from "@/lib/dbConnect";
  // import DesignUpload from "@/models/DesignUpload";
  // import jwt from "jsonwebtoken";
  // import mongoose from "mongoose";
  // import multer from "multer";
  // import path from "path";
  // import fs from "fs";

  // export const config = {
  //   api: {
  //     bodyParser: false, // Required for Multer
  //   },
  // };

  // // Ensure uploads directory exists
  // const uploadDir = path.join(process.cwd(), "public", "uploads", "orders");
  // if (!fs.existsSync(uploadDir)) {
  //   fs.mkdirSync(uploadDir, { recursive: true });
  // }

  // // Configure Multer storage
  // const storage = multer.diskStorage({
  //   destination: function (req, file, cb) {
  //     cb(null, uploadDir);
  //   },
  //   filename: function (req, file, cb) {
  //     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  //     const ext = path.extname(file.originalname);
  //     // keep fieldname so we can identify attribute on DB
  //     cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  //   },
  // });
  // const upload = multer({ storage });

  // export default async function handler(req, res) {
  //   await dbConnect();
  //   const { method } = req;

  //   switch (method) {
  //     case "POST":
  //       // Handle multipart/form-data upload via Multer
  //       return handleFileUpload(req, res);
  //     case "GET":
  //       return handleGet(req, res);
  //     default:
  //       return res.status(405).json({ message: "Method not allowed" });
  //   }
  // }

  // // ✅ POST — Handles both uploaded files or metadata
  // async function handleFileUpload(req, res) {
  //   try {
  //     // Accept any fields (multiple files with different fieldnames)
  //     upload.any()(req, res, async (err) => {
  //       if (err) {
  //         console.error("Upload error:", err);
  //         return res.status(500).json({ message: "File upload failed" });
  //       }

  //       try {
  //         const authHeader = req.headers.authorization;
  //         if (!authHeader)
  //           return res.status(401).json({ message: "No token provided" });

  //         const token = authHeader.split(" ")[1];
  //         const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //         const userId = decoded.id;

  //         let { productId, files } = req.body;

  //         // If multer saved files in req.files
  //         if (req.files && req.files.length > 0) {
  //           // Map, save and return created DB documents
  // const attrMap = (() => {
  //   try {
  //     return req.body?.attrMap ? JSON.parse(req.body.attrMap) : {};
  //   } catch (e) {
  //     return {};
  //   }
  // })();

  // const saved = await Promise.all(
  //   req.files.map(async (file) => {
  //     const fileName = file.filename;
  //     const fileUrl = `/uploads/orders/${fileName}`;
  //     const attributeKey = file.fieldname; // like "Front_Design__0"
  //     const attributeName = attrMap[attributeKey] || attributeKey; // readable name

  //     const savedDoc = await DesignUpload.create({
  //       user: userId,
  //       product: productId,
  //       fileName,
  //       fileUrl,
  //       attribute: attributeKey,      // stable key
  //       attributeName,               // readable name
  //     });

  //     return savedDoc;
  //   })
  // );


  //           return res
  //             .status(200)
  //             .json({ success: true, data: saved, message: "Files uploaded" });
  //         }

  //         // If JSON metadata was sent (frontend sends files array)
  //         if (files) {
  //           try {
  //             files = JSON.parse(files);
  //           } catch {
  //             // Already parsed
  //           }

  //           const savedFiles = await Promise.all(
  //             files.map(async (file) => {
  //               const fileUrl =
  //                 file.url && file.url !== "undefined"
  //                   ? file.url
  //                   : `/uploads/orders/${file.name || "unknown-file"}`;
  //               const fileName =
  //                 file.name || fileUrl.split("/").pop() || "Unnamed file";

  //               // Accept optional attribute field inside file metadata (frontend may send)
  //               const attribute = file.attribute || file.fieldname || null;

  //               return await DesignUpload.create({
  //                 user: userId,
  //                 product: productId,
  //                 fileUrl,
  //                 fileName,
  //                 attribute,
  //               });
  //             })
  //           );

  //           return res
  //             .status(200)
  //             .json({ success: true, data: savedFiles, message: "Files saved" });
  //         }

  //         return res.status(400).json({ message: "No file or files provided" });
  //       } catch (err) {
  //         console.error("Save design error:", err);
  //         return res
  //           .status(500)
  //           .json({ message: err.message || "Internal server error" });
  //       }
  //     });
  //   } catch (err) {
  //     console.error("Upload outer error:", err);
  //     return res.status(500).json({ message: "Server error" });
  //   }
  // }

  // // ✅ GET — Fetch uploaded designs for a product
  // async function handleGet(req, res) {
  //   try {
  //     const { productId, userId, orderId } = req.query;

  //     if (!productId) {
  //       return res.status(400).json({ message: "Missing productId in query" });
  //     }

  //     const query = {
  //       product: new mongoose.Types.ObjectId(productId),
  //     };

  //     if (userId) {
  //       query.user = new mongoose.Types.ObjectId(userId);
  //     }

  //     // 🔥 THIS IS THE KEY FIX
  //     if (orderId) {
  //       query.order = new mongoose.Types.ObjectId(orderId);
  //     }

  //     const designs = await DesignUpload.find(query)
  //       .populate("user", "name email")
  //       .sort({ createdAt: -1 });

  //     return res.status(200).json({ success: true, data: designs });
  //   } catch (err) {
  //     console.error("Get design error:", err);
  //     return res
  //       .status(500)
  //       .json({ message: err.message || "Internal server error" });
  //   }
  // }

