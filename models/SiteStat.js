import mongoose from "mongoose";

// A single figure in the stats strip shown above the product listing, e.g.
// "Partners Registered with Us (India) — 382 — Growing steadily across India".
// The admin manages these from Dashboard → Site Stats.
const SiteStatSchema = new mongoose.Schema(
  {
    // Set on the stat the site ships with, so it is only ever seeded once
    key: { type: String, default: null, unique: true, sparse: true, trim: true },

    // Text shown to the left of the number
    label: { type: String, required: true, trim: true },

    // Text shown to the right of the number. Optional.
    note: { type: String, default: "", trim: true },

    // The number itself. When autoGrow is on this is the starting figure and
    // the strip adds the daily growth on top of it.
    value: { type: Number, default: 0 },

    // Optional characters wrapped around the number, e.g. "+" or "₹"
    prefix: { type: String, default: "", trim: true },
    suffix: { type: String, default: "", trim: true },

    // Lets a figure climb on its own so the strip does not look frozen.
    // Growth is worked out from the date, so every visitor sees the same number.
    autoGrow: {
      enabled: { type: Boolean, default: false },
      perDay: { type: Number, default: 1 },
      startDate: { type: Date, default: null },
    },

    // Lower numbers appear first in the strip
    order: { type: Number, default: 0 },

    // Hidden from the storefront without being deleted
    isActive: { type: Boolean, default: true },

    // Removed by the admin. The stat the site ships with is kept as a record
    // rather than dropped, so deleting it sticks and the seed cannot bring
    // it back on the next page load.
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.SiteStat ||
  mongoose.model("SiteStat", SiteStatSchema);
