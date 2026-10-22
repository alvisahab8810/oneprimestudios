import mongoose from "mongoose";

// One slide of a managed area of the website: the homepage "See it in Action"
// slider, the home page banner (desktop and mobile), or the notices on the
// products page. A file, when there is one, sits on the server under
// /public/uploads/action; only its path is stored here.

// Every area an admin can fill from the dashboard. Rows saved before this
// existed have no section at all and belong to "action" - see sectionQuery.
export const MEDIA_SECTIONS = ["action", "hero-desktop", "hero-mobile", "products-info"];

// Old rows carry no section field, so "action" has to match those too
export const sectionQuery = (section) =>
  section === "action"
    ? { $or: [{ section: "action" }, { section: { $exists: false } }] }
    : { section };
const ActionMediaSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: MEDIA_SECTIONS,
      default: "action",
    },

    // "text" is a slide with no file, used by the products page notices
    type: {
      type: String,
      enum: ["image", "video", "text"],
      required: true,
    },

    // Public path, e.g. /uploads/action/1730000000-press.webp. Empty on a text slide.
    src: { type: String, default: "" },

    // Wording on a text slide, and on a banner the page it opens when clicked
    tag: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    link: { type: String, default: "" },

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

ActionMediaSchema.index({ section: 1, isActive: 1, order: 1 });

export default mongoose.models.ActionMedia ||
  mongoose.model("ActionMedia", ActionMediaSchema);
