import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "DELETE") {
    const { id } = req.query;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Product not found" });

    return res.json({ success: true, message: "Product deleted successfully" });
  }

  res.status(405).json({ success: false, message: "Method not allowed" });
}
