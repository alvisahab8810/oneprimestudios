import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import multer from "multer";
import path from "path";

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

    const order = await Order.findById(req.query.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Design Rejected") {
      return res.status(400).json({ message: "Re-upload not allowed" });
    }

    const fileUrl = `/uploads/reuploads/${req.file.filename}`;

    order.reuploadedFiles.push({ fileUrl });
    order.status = "In Progress"; // reset flow

    await order.save();

    res.json({ success: true });
  });
}
