// pages/api/orders/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Category from "@/models/Category";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "GET") return res.status(405).end();

  const {
    status,
    productId,
    categoryId,
    parentCategoryId,
    search,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip     = (pageNum - 1) * limitNum;

  try {
    // ── Step 1: resolve which productIds match the filters ──────────────────

    let filteredProductIds = null; // null = no product filter active

    if (productId) {
      filteredProductIds = [productId];
    } else if (categoryId || parentCategoryId) {
      // Find all category IDs that match
      let categoryIds = [];

      if (parentCategoryId) {
        // Get parent + all its children
        const children = await Category.find({ parent: parentCategoryId }).select("_id").lean();
        categoryIds = [parentCategoryId, ...children.map(c => String(c._id))];
      } else if (categoryId) {
        categoryIds = [categoryId];
      }

      // Find all products in those categories
      const products = await Product.find({
        category: { $in: categoryIds },
      }).select("_id").lean();

      filteredProductIds = products.map(p => String(p._id));

      // If no products found in this category, return empty
      if (filteredProductIds.length === 0) {
        return res.json({ orders: [], total: 0, totalPages: 0, currentPage: pageNum });
      }
    }

    // ── Step 2: build order filter ───────────────────────────────────────────
    const filter = { user: user._id };

    if (status && status !== "All") filter.status = status;

    if (filteredProductIds) {
      filter["items.product"] = { $in: filteredProductIds };
    }

    // Date range
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // ── Step 3: fetch orders ─────────────────────────────────────────────────
    const [countResult, amtResult] = await Promise.all([
      Order.countDocuments(filter),
      Order.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: "$total" } } }]),
    ]);
    const total       = countResult;
    const totalAmount = amtResult[0]?.sum || 0;

    let orders = await Order.find(filter)
      .populate({
        path: "items.product",
        select: "name mainImage category",
        populate: { path: "category", select: "name parent" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ── Step 4: client-side search on product name / order number ────────────
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.items?.some(i => i.product?.name?.toLowerCase().includes(q))
      );
    }

    return res.json({
      orders,
      total,
      totalAmount,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (err) {
    console.error("Orders fetch error:", err);
    return res.status(500).json({ message: err.message });
  }
}




// // pages/api/orders/index.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import Product from "@/models/Product"; // ✅ IMPORTANT

// export default async function handler(req, res) {
//   await dbConnect();

//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   if (req.method === "GET") {
//     const orders = await Order.find({ user: user._id })
//       .populate({
//         path: "items.product",
//         select: "name mainImage",
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     return res.json({ orders });
//   }

//   return res.status(405).end();
// }
