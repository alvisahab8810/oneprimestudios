



// // pages/api/upload/save-design.js
// import dbConnect from "@/lib/dbConnect";
// import DesignUpload from "@/models/DesignUpload";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   await dbConnect();

//   const { method } = req;

//   switch (method) {
//     case "POST":
//       return handlePost(req, res);
//     case "GET":
//       return handleGet(req, res);
//     default:
//       return res.status(405).json({ message: "Method not allowed" });
//   }
// }

// // ✅ POST — Save uploaded design files
// async function handlePost(req, res) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ message: "No token provided" });

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const userId = decoded.id;

//     const { productId, files } = req.body;
//     if (!productId || !files?.length) {
//       return res.status(400).json({ message: "Missing product or files" });
//     }

//     const savedFiles = await Promise.all(
//       files.map(async (file) => {
//         return await DesignUpload.create({
//           user: userId,
//           product: productId,
//           fileUrl: file.url,
//           fileName: file.name || "",
//         });
//       })
//     );

//     return res.status(200).json({ success: true, data: savedFiles });
//   } catch (err) {
//     console.error("Save design error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }

// // ✅ GET — Fetch uploaded designs
// async function handleGet(req, res) {
//   try {
//     const { productId, userId } = req.query;

//     if (!productId) {
//       return res.status(400).json({ message: "Missing productId in query" });
//     }

//     // If admin panel requests all designs for a product:
//     // const query = { product: productId };s
//     const query = { product: new mongoose.Types.ObjectId(productId) };
//     if (userId) query.user = userId; // Optional filter

//     const designs = await DesignUpload.find(query)
//       .populate("user", "name email")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({ success: true, data: designs });
//   } catch (err) {
//     console.error("Get design error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }


import dbConnect from "@/lib/dbConnect";
import DesignUpload from "@/models/DesignUpload";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Required for Multer
  },
};

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "public", "uploads", "orders");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

export default async function handler(req, res) {
  await dbConnect();
  const { method } = req;

  switch (method) {
    case "POST":
      // Handle multipart/form-data upload via Multer
      return handleFileUpload(req, res);
    case "GET":
      return handleGet(req, res);
    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

// ✅ POST — Handles both uploaded files or metadata
async function handleFileUpload(req, res) {
  try {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ message: "File upload failed" });
      }

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
          return res.status(401).json({ message: "No token provided" });

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        let { productId, files } = req.body;

        // 🧠 If file uploaded via Multer
        if (req.file) {
          const fileName = req.file.filename;
          const fileUrl = `/uploads/orders/${fileName}`;

          const saved = await DesignUpload.create({
            user: userId,
            product: productId,
            fileName,
            fileUrl,
          });

          return res
            .status(200)
            .json({ success: true, data: [saved], message: "File uploaded" });
        }

        // 🧠 If JSON metadata was sent (frontend sends files array)
        if (files) {
          try {
            files = JSON.parse(files);
          } catch {
            // Already parsed
          }

          const savedFiles = await Promise.all(
            files.map(async (file) => {
              const fileUrl =
                file.url && file.url !== "undefined"
                  ? file.url
                  : `/uploads/orders/${file.name || "unknown-file"}`;
              const fileName =
                file.name || fileUrl.split("/").pop() || "Unnamed file";

              return await DesignUpload.create({
                user: userId,
                product: productId,
                fileUrl,
                fileName,
              });
            })
          );

          return res
            .status(200)
            .json({ success: true, data: savedFiles, message: "Files saved" });
        }

        return res.status(400).json({ message: "No file or files provided" });
      } catch (err) {
        console.error("Save design error:", err);
        return res
          .status(500)
          .json({ message: err.message || "Internal server error" });
      }
    });
  } catch (err) {
    console.error("Upload outer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ✅ GET — Fetch uploaded designs for a product
async function handleGet(req, res) {
  try {
    const { productId, userId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Missing productId in query" });
    }

    const query = { product: new mongoose.Types.ObjectId(productId) };
    if (userId) query.user = userId;

    const designs = await DesignUpload.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: designs });
  } catch (err) {
    console.error("Get design error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
}
