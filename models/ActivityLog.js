import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    adminName:  { type: String, default: "Unknown" },
    adminEmail: { type: String, default: "" },
    action:     { type: String, required: true }, // e.g. "order_status_updated"
    entity:     { type: String, default: "" },    // e.g. "order", "product", "user"
    entityId:   { type: String, default: "" },
    description:{ type: String, required: true },
    meta:       { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// TTL index — auto-delete logs older than 180 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
