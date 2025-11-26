// pages/api/products/[id].js
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import nextConnect from "next-connect";

const handler = nextConnect();

// GET single product by ID
handler.get(async (req, res) => {
  await dbConnect();
  const { id } = req.query;

  try {
    const product = await Product.findById(id).populate("category");

    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json(product);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE product
handler.delete(async (req, res) => {
  await dbConnect();
  const { id } = req.query;

  try {
    await Product.findByIdAndDelete(id);
    return res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default handler;
