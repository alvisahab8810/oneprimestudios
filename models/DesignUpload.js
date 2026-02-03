import mongoose from "mongoose";

const DesignUploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

  order: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Order",
},

  fileUrl: { type: String, required: true },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.DesignUpload || mongoose.model("DesignUpload", DesignUploadSchema);
