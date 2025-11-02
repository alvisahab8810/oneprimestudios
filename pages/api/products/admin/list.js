import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();

  const {
    page = 1,
    limit = 10,
    search = "",
    status = "",
    category = "",
    stockStatus = "",
     productFor = "", // ✅ add this
  } = req.query;

  const filter = {};

  if (search) filter.name = { $regex: search, $options: "i" };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (stockStatus) filter.stockStatus = stockStatus;
  if (productFor) filter.productFor = productFor; // ✅ add this line

  const products = await Product.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
}
