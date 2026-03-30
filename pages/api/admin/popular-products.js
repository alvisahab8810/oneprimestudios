import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        category = "",
        productFor = "",
        isPopular = "",
      } = req.query;

      const filter = { status: "published" };
      if (search.trim()) filter.name = { $regex: search.trim(), $options: "i" };
      if (category) filter.category = category;
      if (productFor) filter.productFor = productFor;
      if (isPopular === "true") filter.isPopular = true;
      if (isPopular === "false") filter.isPopular = { $ne: true };

      const skip = (Number(page) - 1) * Number(limit);
      const [products, total] = await Promise.all([
        Product.find(filter)
          .select("_id name mainImage basePrice salePrice isPopular productFor category")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments(filter),
      ]);

      return res.status(200).json({
        products,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { productId, isPopular } = req.body;
      if (!productId) return res.status(400).json({ message: "productId required" });
      await Product.findByIdAndUpdate(productId, { isPopular: !!isPopular });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
