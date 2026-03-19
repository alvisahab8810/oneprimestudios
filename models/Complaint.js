// models/Complaint.js
import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    message: { type: String, required: true, trim: true },
    images: [{ type: String }], // up to 5 Cloudinary/local URLs
    video: { type: String, default: null }, // single video URL
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Initiated", "Resolved"],
      default: "Pending",
    },
    adminReply: { type: String, default: "" },
    complaintNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

// Auto-generate complaint number before save
ComplaintSchema.pre("save", async function (next) {
  if (!this.complaintNumber) {
    const count = await mongoose.model("Complaint").countDocuments();
    const date  = new Date();
    this.complaintNumber = `CMP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.Complaint || mongoose.model("Complaint", ComplaintSchema);