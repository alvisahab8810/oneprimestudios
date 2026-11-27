// models/FlashSale.js
// A timed retail (B2C) deal: a group of products sold at one deal price
// (for example "Everything at ₹399") until the timer runs out.
//
// A deal is live while it is enabled and the current time is between
// startsAt and endsAt. Nothing has to run when the timer ends: the deal simply
// stops matching, so the home section, the deal page and the deal price all
// disappear together. Moving endsAt forward in the editor starts it again.
import mongoose from "mongoose";

const FlashSaleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // Price for this product only. Empty means the deal's own price applies.
    price: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const FlashSaleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    subtitle: { type: String, default: "", trim: true, maxlength: 160 },

    // Price for one batch (the product's minimum order quantity), the same
    // way salePrice is stored on a product
    dealPrice: { type: Number, required: true, min: 1 },

    products: { type: [FlashSaleItemSchema], default: [] },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FlashSaleSchema.index({ enabled: 1, startsAt: 1, endsAt: 1 });
FlashSaleSchema.index({ "products.product": 1 });

export default mongoose.models.FlashSale || mongoose.model("FlashSale", FlashSaleSchema);
