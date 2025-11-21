// pages/api/categories/parents.js
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";

export default async function handler(req, res) {
  await dbConnect();

  try {
    // ONLY parent categories (parent = null)
    const parents = await Category.find({ parent: null }).sort({ name: 1 });
    res.status(200).json(parents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
