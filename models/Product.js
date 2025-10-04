

// import mongoose from "mongoose";

// const AttributeValueSchema = new mongoose.Schema(
//   {
//     label: { type: String, required: true },
//     priceModifier: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// const AttributeSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     type: { type: String, enum: ["text", "number", "select", "checkbox"], default: "select" },
//     values: [AttributeValueSchema],
//     required: { type: Boolean, default: false },
//   },
//   { _id: false }
// );

// const PricingTierSchema = new mongoose.Schema(
//   {
//     minQty: { type: Number, required: true },
//     pricePerUnit: { type: Number, required: true },
//   },
//   { _id: false }
// );

// const ProductSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     slug: { type: String, required: true, unique: true },
//     shortDescription: { type: String },
//     description: { type: String },
//     ourSpecialization: { type: String, default: "" },
//     importantNotes: { type: String, default: "" },

//     mainImage: { type: String },
//     gallery: [{ type: String }],

//     category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

//     basePrice: { type: Number, required: true }, // ✅ correct
//     salePrice: { type: Number },

//     sku: { type: String, unique: true, sparse: true },
//     stock: { type: Number, default: 0 },
//     stockStatus: { type: String, enum: ["in_stock", "out_of_stock", "preorder"], default: "in_stock" },
//     minOrderQty: { type: Number, default: 1 },
//     isFeatured: { type: Boolean, default: false },

//     productFor: { type: String, enum: ["b2b", "b2c", "both"], default: "both" },

//     attributes: [AttributeSchema],
//     pricingTiers: [PricingTierSchema],

//     b2bOptions: {
//       enabled: { type: Boolean, default: false },
//       allowFileUpload: { type: Boolean, default: true },
//     },
//     b2cOptions: {
//       enabled: { type: Boolean, default: false },
//       designUpload: { type: Boolean, default: true },
//       whatsappSupport: { type: Boolean, default: true },
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Product || mongoose.model("Product", ProductSchema);

import mongoose from "mongoose";

// ---------------- Sub Schemas ----------------
const AttributeValueSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    priceModifier: { type: Number, default: 0 },
  },
  { _id: false }
);

const AttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "number", "select", "checkbox"],
      default: "select",
    },
    values: [AttributeValueSchema],
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const PricingTierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
  },
  { _id: false }
);

// ---------------- Main Product Schema ----------------
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String },
    description: { type: String },
    ourSpecialization: { type: String, default: "" },
    importantNotes: { type: String, default: "" },

    mainImage: { type: String },
    gallery: [{ type: String }],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    basePrice: { type: Number, required: true },
    salePrice: { type: Number },

    sku: { type: String, unique: true, sparse: true },
    stock: { type: Number, default: 0 },
    stockStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "preorder"],
      default: "in_stock",
    },
    minOrderQty: { type: Number, default: 1 },
    isFeatured: { type: Boolean, default: false },

    productFor: {
      type: String,
      enum: ["b2b", "b2c", "both"],
      default: "both",
    },

    attributes: [AttributeSchema], // ✅ restored
    pricingTiers: [PricingTierSchema], // ✅ restored

    b2bOptions: {
      enabled: { type: Boolean, default: false },
      allowFileUpload: { type: Boolean, default: true },
    },
    b2cOptions: {
      enabled: { type: Boolean, default: false },
      designUpload: { type: Boolean, default: true },
      whatsappSupport: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// ---------------- Slug Auto Generator ----------------
ProductSchema.pre("save", async function (next) {
  if (this.isModified("name")) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    // ensure uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Product.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.slug = slug;
  }
  next();
});

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
