import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { logActivity } from "@/lib/logActivity";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "DELETE") {
    const { id } = req.query;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, message: "Product deleted successfully" });

    logActivity(req, "product_deleted",
      `Product "${deleted.name}" deleted`,
      { entity: "product", entityId: id, meta: { productName: deleted.name, slug: deleted.slug } }
    );
    return;
  }

  res.status(405).json({ success: false, message: "Method not allowed" });
}
