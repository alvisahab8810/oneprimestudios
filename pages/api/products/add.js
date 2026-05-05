// pages/api/products/index.js
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { logActivity } from "@/lib/logActivity";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const products = await Product.find({});
      res.status(200).json(products);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
      logActivity(req, "product_added",
        `Product "${product.name}" added`,
        { entity: "product", entityId: String(product._id), meta: { productName: product.name, slug: product.slug } }
      );
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
}
