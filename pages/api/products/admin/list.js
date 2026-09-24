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
    stock = "",
    productFor = "",
  } = req.query;

  const filter = {};

  // Availability, using the same rules as the summary below and lib/stockRules,
  // so a card's number and the list it opens always agree.
  const STOCK_FILTERS = {
    out: {
      $or: [{ stockStatus: "out_of_stock" }, { stock: { $lte: 0 } }, { stock: { $exists: false } }],
    },
    in: {
      $and: [{ stockStatus: { $ne: "out_of_stock" } }, { stock: { $gt: 0 } }],
    },
    low: {
      $and: [
        { stockStatus: { $ne: "out_of_stock" } },
        { stock: { $gt: 0 } },
        { $expr: { $lt: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$minOrderQty", 1] }] } },
      ],
    },
  };

  if (search) filter.name = { $regex: search, $options: "i" };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (stockStatus) filter.stockStatus = stockStatus;
  if (productFor) filter.productFor = productFor;
  if (STOCK_FILTERS[stock]) Object.assign(filter, STOCK_FILTERS[stock]);

  const products = await Product.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);

  // Stock summary for the cards above the table — counted over the whole
  // filtered list, not just the page being shown.
  const [summaryRow] = await Product.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalUnits: { $sum: { $ifNull: ["$stock", 0] } },
        outOfStock: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$stockStatus", "out_of_stock"] }, { $lte: [{ $ifNull: ["$stock", 0] }, 0] }] },
              1,
              0,
            ],
          },
        },
        lowStock: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$stockStatus", "out_of_stock"] },
                  { $gt: [{ $ifNull: ["$stock", 0] }, 0] },
                  { $lt: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$minOrderQty", 1] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const summary = {
    totalProducts: total,
    totalUnits: summaryRow?.totalUnits || 0,
    outOfStock: summaryRow?.outOfStock || 0,
    lowStock: summaryRow?.lowStock || 0,
    inStock: total - (summaryRow?.outOfStock || 0),
  };

  res.status(200).json({
    success: true,
    data: products,
    summary,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
}
