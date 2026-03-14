// pages/api/categories/index.js
// FIX: ?withChildren=true now correctly queries ONLY parent:null as base,
// preventing subcategories from appearing as both top-level rows AND children.

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

// GET /api/categories
// ?parents=true        → only top-level (parent: null) categories
// ?search=xxx          → filter by name (case-insensitive)
// ?withChildren=true   → top-level parents each with a children[] array (admin panel)
handler.get(async (req, res) => {
  await dbConnect();
  try {
    const { parents, search, withChildren } = req.query;

    // ── withChildren: used by admin panel ─────────────────────────────────
    // BUG WAS HERE: old code did Category.find({}) → got ALL categories
    // (parents + children) as top-level, then also attached them as children.
    // FIX: always start from parent:null when withChildren=true.
    if (withChildren === "true") {
      const topLevelParents = await Category.find({ parent: null })
        .sort({ name: 1 })
        .lean();

      const parentIds = topLevelParents.map((c) => c._id);

      const children = await Category.find({ parent: { $in: parentIds } })
        .sort({ name: 1 })
        .lean();

      const result = topLevelParents.map((cat) => ({
        ...cat,
        children: children.filter(
          (ch) => String(ch.parent) === String(cat._id)
        ),
      }));

      return res.status(200).json(result);
    }

    // ── Normal flat list ──────────────────────────────────────────────────
    const filter = {};
    if (parents === "true") filter.parent = null;
    if (search) filter.name = { $regex: search, $options: "i" };

    const categories = await Category.find(filter).sort({ name: 1 }).lean();
    return res.status(200).json(categories);

  } catch (err) {
    console.error("categories GET error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/categories — unchanged
handler.post(upload.single("image"), async (req, res) => {
  await dbConnect();
  try {
    const { name, parent, categoryFor } = req.body;
    if (!name) return res.status(400).json({ message: "Category name required" });

    const slug = slugify(name);
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
      categoryFor: categoryFor || "both",
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("categories POST error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export const config = { api: { bodyParser: false } };
export default handler;



// // pages/api/categories/index.js
// import nextConnect from "next-connect";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import dbConnect from "@/lib/dbConnect";
// import Category from "@/models/Category";

// const uploadDir = path.join(process.cwd(), "public/uploads/categories");
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     const safe = file.originalname.replace(/\s+/g, "-");
//     cb(null, `${Date.now()}-${safe}`);
//   },
// });
// const upload = multer({ storage });

// const handler = nextConnect({
//   onError(err, req, res) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   },
//   onNoMatch(req, res) {
//     res.status(405).json({ message: "Method not allowed" });
//   },
// });

// function slugify(text = "") {
//   return text
//     .toString()
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^\w\-]+/g, "")
//     .replace(/\-\-+/g, "-");
// }

// // GET all categories (returns array)
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     // Optionally allow query param ?parents=true to return only top-level categories
//     const onlyParents = req.query.parents === "true";
//     const filter = onlyParents ? { parent: null } : {};
//     const categories = await Category.find(filter).sort({ name: 1 }).lean();
//     return res.status(200).json(categories);
//   } catch (err) {
//     console.error("categories GET error:", err);
//     return res.status(500).json({ message: err.message });
//   }
// });

// // POST create category (multipart/form-data with optional image, parent)
// handler.post(upload.single("image"), async (req, res) => {
//   await dbConnect();
//   try {
//     const { name, parent } = req.body;
//     if (!name) return res.status(400).json({ message: "Category name required" });

//     const slug = slugify(name);
//     // ensure uniqueness: try slug, append suffix if needed
//     let finalSlug = slug;
//     let suffix = 1;
//     /* eslint-disable no-await-in-loop */
//     while (await Category.findOne({ $or: [{ slug: finalSlug }, { name }] })) {
//       finalSlug = `${slug}-${suffix++}`;
//     }

//     const image = req.file ? `/uploads/categories/${req.file.filename}` : "";

//     const category = await Category.create({
//       name,
//       slug: finalSlug,
//       parent: parent || null,
//       image,
//     });

//     return res.status(201).json(category);
//   } catch (err) {
//     console.error("categories POST error:", err);
//     return res.status(500).json({ message: err.message });
//   }
// });

// export const config = { api: { bodyParser: false } };
// export default handler;
