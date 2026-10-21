import mongoose from "mongoose";

// One photo or video in the homepage "See it in Action" slider. The file itself
// sits on the server under /public/uploads/action; only its path is stored here.
const ActionMediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    // Public path, e.g. /uploads/action/1730000000-press.webp
    src: { type: String, required: true },

    // Shown to screen readers, and while a video is still loading
    alt: { type: String, default: "" },

    // Original upload size in bytes, so the admin screen can show it back
    size: { type: Number, default: 0 },

    // Lower numbers come first in the slider
    order: { type: Number, default: 0 },

    // Hidden items stay on disk but are not sent to the website
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ActionMediaSchema.index({ isActive: 1, order: 1 });

export default mongoose.models.ActionMedia ||
  mongoose.model("ActionMedia", ActionMediaSchema);
