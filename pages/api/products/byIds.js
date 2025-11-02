import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();

  const ids = req.query.ids?.split(",") || [];
  if (!ids.length) return res.json([]);

  const products = await Product.find({ _id: { $in: ids } });
  res.json(products);
}
