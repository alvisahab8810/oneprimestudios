import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "public/uploads/reuploads");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") return res.status(405).end();

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const order = await Order.findById(req.query.id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Design Rejected") {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Re-upload not allowed" });
    }

    // Gather upload rules from all upload-type attributes across all items
    const rules = (order.items || []).flatMap(item =>
      (item.product?.attributes || [])
        .filter(attr => attr.type === "upload")
        .map(attr => attr.uploadRules)
    ).filter(Boolean);

    const acceptTypes = [...new Set(rules.flatMap(r => r.acceptTypes || []))];
    const maxSizeMB = rules.length > 0
      ? Math.min(...rules.map(r => r.maxSizeMB || 10))
      : 10;

    // Validate file extension
    if (acceptTypes.length > 0) {
      const ext = req.file.originalname.split(".").pop().toLowerCase();
      if (!acceptTypes.map(t => t.toLowerCase()).includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: `Only ${acceptTypes.map(t => t.toUpperCase()).join(", ")} files are allowed`,
        });
      }
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (req.file.size > maxBytes) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `File size must be under ${maxSizeMB}MB` });
    }

    const fileUrl = `/uploads/reuploads/${req.file.filename}`;

    order.reuploadedFiles.push({ fileUrl });
    // OLD: order.status = "In Progress"; // was auto-advancing status after re-upload
    // NEW: stay "Pending" so admin reviews the new file before advancing
    order.status = "Pending";

    await order.save();

    res.json({ success: true });
  });
}
