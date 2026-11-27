// pages/api/admin/reviews/[id].js
// PATCH  { status }                                → publish or hide any review
// PATCH  { productId, userName, rating, comment }  → edit a review the admin added
// DELETE                                           → remove a review
// A buyer's own words and rating are never rewritten; the admin can only
// publish, hide or delete them.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";

const MAX_COMMENT = 1000;
const MAX_NAME = 80;

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "reviews");
  if (!admin) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id || "")) {
    return res.status(400).json({ message: "Invalid review id" });
  }

  try {
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (req.method === "DELETE") {
      await review.deleteOne();
      return res.json({ success: true });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};

      if (body.status !== undefined) {
        if (body.status !== "Published" && body.status !== "Hidden") {
          return res.status(400).json({ message: "Invalid status" });
        }
        review.status = body.status;
      }

      const editsContent = ["productId", "userName", "rating", "comment"].some((k) => body[k] !== undefined);
      if (editsContent) {
        if (review.source !== "admin") {
          return res.status(400).json({ message: "A buyer's review cannot be edited. You can hide or delete it." });
        }
        if (body.productId !== undefined) {
          if (!mongoose.Types.ObjectId.isValid(body.productId || "")) {
            return res.status(400).json({ message: "Select a product" });
          }
          const product = await Product.findById(body.productId).select("_id").lean();
          if (!product) return res.status(404).json({ message: "Product not found" });
          review.product = product._id;
        }
        if (body.rating !== undefined) {
          const stars = Math.round(Number(body.rating));
          if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
            return res.status(400).json({ message: "Pick a rating between 1 and 5 stars" });
          }
          review.rating = stars;
        }
        if (body.userName !== undefined) {
          const name = String(body.userName || "").trim().slice(0, MAX_NAME);
          if (!name) return res.status(400).json({ message: "Enter the reviewer name" });
          review.userName = name;
        }
        if (body.comment !== undefined) {
          review.comment = String(body.comment || "").trim().slice(0, MAX_COMMENT);
        }
      }

      await review.save();
      return res.json({ success: true, review });
    }

    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Admin review update error:", err);
    return res.status(500).json({ message: "Could not update the review" });
  }
}
