

// // models/Category.js
// import mongoose from "mongoose";

// const CategorySchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     // type: { type: String, enum: ["b2b", "b2c", "both"], default: "both" }, // NEW field
//     slug: { type: String, required: true, unique: true },
    
//     // ADD THIS 👇
//     parent: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       default: null,
//     },

    
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Category || mongoose.model("Category", CategorySchema);




// models/Category.js
import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    image: { type: String, default: "" }, // store path like /uploads/categories/...
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
