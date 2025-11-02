// // pages/api/upload/save-design.js
// import dbConnect from "@/lib/dbConnect";
// import DesignUpload from "@/models/DesignUpload";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     // ✅ Get token from headers
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ message: "No token provided" });

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const userId = decoded.id; // 👈 Make sure your token stores `id`

//     // ✅ Extract product and files
//     const { productId, files } = req.body;
//     if (!productId || !files?.length) {
//       return res.status(400).json({ message: "Missing product or files" });
//     }

//     // ✅ Save multiple files
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




// pages/api/upload/save-design.js
import dbConnect from "@/lib/dbConnect";
import DesignUpload from "@/models/DesignUpload";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case "POST":
      return handlePost(req, res);
    case "GET":
      return handleGet(req, res);
    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

// ✅ POST — Save uploaded design files
async function handlePost(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { productId, files } = req.body;
    if (!productId || !files?.length) {
      return res.status(400).json({ message: "Missing product or files" });
    }

    const savedFiles = await Promise.all(
      files.map(async (file) => {
        return await DesignUpload.create({
          user: userId,
          product: productId,
          fileUrl: file.url,
          fileName: file.name || "",
        });
      })
    );

    return res.status(200).json({ success: true, data: savedFiles });
  } catch (err) {
    console.error("Save design error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ✅ GET — Fetch uploaded designs
async function handleGet(req, res) {
  try {
    const { productId, userId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Missing productId in query" });
    }

    // If admin panel requests all designs for a product:
    const query = { product: productId };
    if (userId) query.user = userId; // Optional filter

    const designs = await DesignUpload.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: designs });
  } catch (err) {
    console.error("Get design error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
