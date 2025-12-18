// pages/api/public-categories/index.js
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const { userType } = req.query;

    let filter = {};

    // 🔒 Guest / B2C users → ONLY B2C + BOTH
    if (!userType || userType === "b2c" || userType === "customer") {
      filter.categoryFor = { $in: ["b2c", "both"] };
    }

    // 🔐 B2B users → B2B + BOTH
    if (userType === "b2b" || userType === "partner") {
      filter.categoryFor = { $in: ["b2b", "both"] };
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json(categories);
  } catch (err) {
    console.error("public categories error:", err);
    return res.status(500).json({ message: err.message });
  }
}
