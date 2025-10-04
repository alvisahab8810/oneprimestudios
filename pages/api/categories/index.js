// pages/api/categories/index.js
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const categories = await Category.find().sort({ name: 1 });
      return res.status(200).json(categories);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Category name required" });

      const slug = slugify(name);
      const exists = await Category.findOne({ $or: [{ name }, { slug }] });
      if (exists) return res.status(400).json({ message: "Category already exists" });

      const category = await Category.create({ name, slug });
      return res.status(201).json(category);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
