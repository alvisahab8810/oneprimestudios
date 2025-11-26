// // pages/api/categories/index.js
// import dbConnect from "@/lib/dbConnect";
// import Category from "@/models/Category";

// function slugify(text = "") {
//   return text
//     .toString()
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^\w\-]+/g, "")
//     .replace(/\-\-+/g, "-");
// }

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "GET") {
//     try {
//       const categories = await Category.find().sort({ name: 1 });
//       return res.status(200).json(categories);
//     } catch (err) {
//       return res.status(500).json({ message: err.message });
//     }
//   }

//   if (req.method === "POST") {
//     try {
//       const { name } = req.body;
//       if (!name) return res.status(400).json({ message: "Category name required" });

//       const slug = slugify(name);
//       const exists = await Category.findOne({ $or: [{ name }, { slug }] });
//       if (exists) return res.status(400).json({ message: "Category already exists" });

//       // const category = await Category.create({ name, slug });
//       const category = await Category.create({
//   name,
//   slug,
//   parent: req.body.parent || null,   // ← SAVE THE PARENT
// });

//       return res.status(201).json(category);
//     } catch (err) {
//       return res.status(500).json({ message: err.message });
//     }
//   }

//   res.status(405).json({ message: "Method not allowed" });
// }









// pages/api/categories/index.js
import nextConnect from "next-connect";
import multer from "multer";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";

const uploadDir = path.join(process.cwd(), "public/uploads/categories");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

const handler = nextConnect({
  onError(err, req, res) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  },
  onNoMatch(req, res) {
    res.status(405).json({ message: "Method not allowed" });
  },
});

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// GET all categories (returns array)
handler.get(async (req, res) => {
  await dbConnect();
  try {
    // Optionally allow query param ?parents=true to return only top-level categories
    const onlyParents = req.query.parents === "true";
    const filter = onlyParents ? { parent: null } : {};
    const categories = await Category.find(filter).sort({ name: 1 }).lean();
    return res.status(200).json(categories);
  } catch (err) {
    console.error("categories GET error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// POST create category (multipart/form-data with optional image, parent)
handler.post(upload.single("image"), async (req, res) => {
  await dbConnect();
  try {
    const { name, parent } = req.body;
    if (!name) return res.status(400).json({ message: "Category name required" });

    const slug = slugify(name);
    // ensure uniqueness: try slug, append suffix if needed
    let finalSlug = slug;
    let suffix = 1;
    /* eslint-disable no-await-in-loop */
    while (await Category.findOne({ $or: [{ slug: finalSlug }, { name }] })) {
      finalSlug = `${slug}-${suffix++}`;
    }

    const image = req.file ? `/uploads/categories/${req.file.filename}` : "";

    const category = await Category.create({
      name,
      slug: finalSlug,
      parent: parent || null,
      image,
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("categories POST error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export const config = { api: { bodyParser: false } };
export default handler;
