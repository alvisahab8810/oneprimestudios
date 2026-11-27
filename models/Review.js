// models/Review.js — a rating on a product.
// Two kinds:
// - "customer": left by a buyer on a product they received. One review per
//   product per order, so a repeat buyer can rate the same product again after
//   a later order, and editing an existing one updates it in place.
// - "admin": added by the store from the admin dashboard. It has no buyer and
//   no order. Because the unique index below covers user + product + order,
//   an admin review stores its own _id in `order` so that several admin
//   reviews on one product never collide.
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, default: "" },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },

    // Kept on the review so a name still shows if the account is removed.
    // For an admin review this is the reviewer name the admin typed.
    userName: { type: String, default: "" },
    userType: { type: String, default: "customer" },

    source: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    // The admin who added an admin review
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },

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
