// models/Review.js — a rating a buyer leaves on a product they have received.
// One review per product per order, so a repeat buyer can rate the same product
// again after a later order, and editing an existing one updates it in place.
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, default: "" },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },

    // Kept on the review so a name still shows if the account is removed
    userName: { type: String, default: "" },
    userType: { type: String, default: "customer" },

    // An admin can take a review down without deleting what the buyer wrote
    status: {
      type: String,
      enum: ["Published", "Hidden"],
      default: "Published",
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
