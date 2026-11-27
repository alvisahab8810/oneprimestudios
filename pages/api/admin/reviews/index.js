// pages/api/admin/reviews/index.js
// GET  ?page=&limit=&search=&source=&status=&rating=&productFor=&productId=
//      → every review, from buyers and from the admin, with a summary
// POST { productId, userName, rating, comment, status }
//      → adds a review from the admin dashboard
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";

const MAX_COMMENT = 1000;
const MAX_NAME = 80;
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "reviews");
  if (!admin) return;

  if (req.method === "GET") return list(req, res);
  if (req.method === "POST") return create(req, res, admin);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const { search = "", source = "", status = "", rating = "", productFor = "", productId = "" } = req.query;

    const filter = {};
    if (source === "admin") filter.source = "admin";
    if (source === "customer") filter.source = { $ne: "admin" };
    if (status === "Published" || status === "Hidden") filter.status = status;
    const stars = parseInt(rating, 10);
    if (stars >= 1 && stars <= 5) filter.rating = stars;

    // Product filters: one product, or every B2B / B2C product
    let productIds = null;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      productIds = [new mongoose.Types.ObjectId(String(productId))];
    } else if (productFor === "b2b" || productFor === "b2c") {
      const products = await Product.find({ productFor: { $in: [productFor, "both"] } }).select("_id").lean();
      productIds = products.map((p) => p._id);
    }

    const term = String(search).trim().slice(0, 80);
    if (term) {
      const rx = new RegExp(escapeRegex(term), "i");
      const matched = await Product.find({ name: rx }).select("_id").limit(200).lean();
      filter.$or = [
        { userName: rx },
        { comment: rx },
        { orderNumber: rx },
        { product: { $in: matched.map((p) => p._id) } },
      ];
    }
    if (productIds) filter.product = { $in: productIds };

    const [rows, total, summaryRows] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug mainImage productFor")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: { $sum: { $cond: [{ $eq: ["$status", "Published"] }, 1, 0] } },
            hidden: { $sum: { $cond: [{ $eq: ["$status", "Hidden"] }, 1, 0] } },
            admin: { $sum: { $cond: [{ $eq: ["$source", "admin"] }, 1, 0] } },
            average: { $avg: "$rating" },
          },
        },
      ]),
    ]);

    const s = summaryRows[0] || {};
    return res.json({
      data: rows.map((r) => ({ ...r, source: r.source === "admin" ? "admin" : "customer" })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        total: s.total || 0,
        published: s.published || 0,
        hidden: s.hidden || 0,
        admin: s.admin || 0,
        customer: (s.total || 0) - (s.admin || 0),
        average: s.average ? Math.round(s.average * 10) / 10 : 0,
      },
    });
  } catch (err) {
    console.error("Admin reviews list error:", err);
    return res.status(500).json({ message: "Could not load reviews" });
  }
}

async function create(req, res, admin) {
  const { productId, userName = "", rating, comment = "", status = "Published" } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(productId || "")) {
    return res.status(400).json({ message: "Select a product" });
  }
  const stars = Math.round(Number(rating));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ message: "Pick a rating between 1 and 5 stars" });
  }
  const name = String(userName || "").trim().slice(0, MAX_NAME);
  if (!name) return res.status(400).json({ message: "Enter the reviewer name" });

  try {
    const product = await Product.findById(productId).select("_id").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    // See models/Review.js: the review's own id fills `order` so the unique
    // index never blocks a second admin review on the same product
    const _id = new mongoose.Types.ObjectId();
    const review = await Review.create({
      _id,
      order: _id,
      user: null,
      product: product._id,
      rating: stars,
      comment: String(comment || "").trim().slice(0, MAX_COMMENT),
      userName: name,
      userType: "customer",
      source: "admin",
      addedBy: admin.id,
      status: status === "Hidden" ? "Hidden" : "Published",
    });

    return res.status(201).json({ success: true, review });
  } catch (err) {
    console.error("Admin review create error:", err);
    return res.status(500).json({ message: "Could not add the review" });
  }
}
