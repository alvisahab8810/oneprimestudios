import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { verifyAdmin } from "@/lib/verifyJWT";
import multer from "multer";
import path from "path";

const uploadDir = path.join(
  process.cwd(),
  "public/uploads/delivery-challans"
);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // 🔐 Admin auth (SAME AS YOUR OTHER APIs)
  const admin = await verifyAdmin(req, res);
  if (!admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  upload.single("challan")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { id: orderId } = req.query;
    const { remarks } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Delivery challan is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const fileUrl = `/uploads/delivery-challans/${req.file.filename}`;

    // Save delivery details
    order.deliveryChallan = {
      fileUrl,
      uploadedAt: new Date(),
    };

    order.deliveryRemarks = remarks || "";
    order.status = "Order Delivered";
    order.deliveredAt = new Date();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery challan uploaded successfully",
      order,
    });
  });
}
