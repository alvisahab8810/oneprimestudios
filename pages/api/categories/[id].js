// pages/api/categories/[id].js
import nextConnect from "next-connect";
import multer from "multer";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import Product from "@/models/Product"; // used to check products under category

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
});

handler.use(upload.single("image"));

// GET category
handler.get(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    const cat = await Category.findById(id).lean();
    if (!cat) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json(cat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

// PUT update category (multipart/form-data)
handler.put(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    const { name, parent } = req.body;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) {
      // update slug only if name changed (keeps it stable unless you want otherwise)
      const newSlugBase = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");
      let newSlug = newSlugBase;
      let suffix = 1;
      while (await Category.findOne({ slug: newSlug, _id: { $ne: category._id } })) {
        newSlug = `${newSlugBase}-${suffix++}`;
      }
      category.name = name;
      category.slug = newSlug;
    }

    category.parent = parent || null;

    if (req.file) {
      category.image = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();
    return res.status(200).json(category);
  } catch (err) {
    console.error("Category update error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// DELETE category
handler.delete(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    // Prevent deleting if there are child categories
    const child = await Category.findOne({ parent: id });
    if (child) {
      return res.status(400).json({ message: "Cannot delete: category has sub-categories" });
    }
    // Prevent deleting if products exist under this category
    const product = await Product.findOne({ category: id });
    if (product) {
      return res.status(400).json({ message: "Cannot delete: products exist in this category" });
    }

    await Category.findByIdAndDelete(id);
    return res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    console.error("Category delete error:", err);
    return res.status(500).json({ message: err.message });
  }
});

export const config = { api: { bodyParser: false } };
export default handler;
