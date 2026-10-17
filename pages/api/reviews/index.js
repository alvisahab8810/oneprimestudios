// pages/api/reviews/index.js
// GET  ?productId=...           → published reviews + summary for a product (public)
// GET  ?orderId=...             → the signed-in buyer's own reviews for that order
// POST { orderId, productId, rating, comment }
//       → only from the buyer who received that order, and only after delivery
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import getUserFromToken from "@/lib/getUserFromToken";
import Review from "@/models/Review";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { isDelivered } from "@/lib/orderRules";

const MAX_COMMENT = 1000;

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const { productId, orderId } = req.query;

    // The buyer's own reviews for one order — used to prefill the rating form
    if (orderId) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "Invalid order id" });
      }
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const reviews = await Review.find({ order: orderId, user: user._id })
        .select("product rating comment status createdAt updatedAt")
        .lean();
      return res.json({ reviews });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const reviews = await Review.find({ product: productId, status: "Published" })
      .select("rating comment userName createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating) || 0);
      if (breakdown[star] !== undefined) breakdown[star] += 1;
    });

    return res.json({
      reviews,
      summary: {
        total,
        average: total ? Math.round((sum / total) * 10) / 10 : 0,
        breakdown,
      },
    });
  }

  if (req.method === "POST") {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { orderId, productId, rating, comment = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(orderId || "")) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!mongoose.Types.ObjectId.isValid(productId || "")) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const stars = Math.round(Number(rating));
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ message: "Pick a rating between 1 and 5 stars" });
    }

    try {
      const order = await Order.findById(orderId).select("user status orderNumber items").lean();
      if (!order) return res.status(404).json({ message: "Order not found" });

      // A review is only accepted from the buyer whose order it is
      const ownerId = order.user?._id || order.user;
      if (String(ownerId) !== String(user._id)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!isDelivered(order)) {
        return res.status(400).json({ message: "You can review this order once it is delivered" });
      }

      // The product must actually be on that order
      const onOrder = (order.items || []).some(
        (item) => String(item.product?._id || item.product) === String(productId)
      );
      if (!onOrder) {
        return res.status(400).json({ message: "This product is not part of that order" });
      }

      const product = await Product.findById(productId).select("_id").lean();
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Rating the same product on the same order again edits the review
      const review = await Review.findOneAndUpdate(
        { user: user._id, product: productId, order: orderId },
        {
          $set: {
            rating: stars,
            comment: String(comment || "").trim().slice(0, MAX_COMMENT),
            orderNumber: order.orderNumber || "",
            userName: user.name || "",
            userType: user.userType || "customer",
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ success: true, review });
    } catch (err) {
      console.error("Review save error:", err);
      return res.status(500).json({ message: "Could not save your review" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}
