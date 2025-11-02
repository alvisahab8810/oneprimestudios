import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PUT") {
    const { status } = req.body;
    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    return res.json({ success: true, data: product });
  }

  res.status(405).json({ success: false, message: "Method not allowed" });
}
