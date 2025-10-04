// pages/api/upload.js
import nextConnect from "next-connect";
import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "./public/uploads/orders";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({ storage });

const apiRoute = nextConnect({
  onError(err, req, res) {
    console.error(err);
    res.status(500).json({ error: `Upload error: ${err.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method ${req.method} Not allowed` });
  },
});

apiRoute.use(upload.array("files", 10)); // accepts files field 'files' (multiple)

apiRoute.post((req, res) => {
  const files = (req.files || []).map((f) => `/uploads/orders/${f.filename}`);
  res.status(200).json({ files });
});

export const config = { api: { bodyParser: false } };
export default apiRoute;
