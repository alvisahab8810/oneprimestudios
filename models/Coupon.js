import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    maxDiscount: Number,

    minOrderAmount: {
      type: Number,
      default: 0,
    },

    expiryDate: Date,

    usageLimit: Number,

    usedCount: {
      type: Number,
      default: 0,
    },

    perUserLimit: {
      type: Number,
      default: 1,
    },

  // Products this coupon is limited to. Empty means it works on the whole
  // cart, which is how every coupon made before this behaved.
  products: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    default: [],
  },

  allowedUserTypes: {
  type: [String],
  enum: ["customer", "partner"],
  default: ["customer"], // safest default
},


usedByUsers: {
  type: [mongoose.Schema.Types.ObjectId],
  default: [],
},


    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ SAFE EXPORT (NO CRASH)
export default mongoose.models?.Coupon ||
  mongoose.model("Coupon", CouponSchema);
