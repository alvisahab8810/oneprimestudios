// models/Blog.js — blog posts written in the admin panel (content is Markdown).
import mongoose from "mongoose";

const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1";

const ImageSchema = new mongoose.Schema(
  { src: { type: String, default: "" }, alt: { type: String, default: "" } },
  { _id: false }
);

const SchemaBlockSchema = new mongoose.Schema(
  { type: { type: String, default: "BlogPosting" }, content: { type: String, default: "" } },
  { _id: false }
);

const FaqItemSchema = new mongoose.Schema(
  { question: { type: String, default: "" }, answer: { type: String, default: "" } },
  { _id: false }
);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    coverImage: { type: ImageSchema, default: () => ({}) },
    cardImage: { type: ImageSchema, default: () => ({}) },
    content: { type: String, default: "" },
    summary: { type: String, default: "" },

    // Legacy single schema, kept in sync with schemas[0]
    schema: { type: String, default: "" },
    schemaType: { type: String, default: "BlogPosting" },
    schemas: { type: [SchemaBlockSchema], default: [] },

    status: { type: String, enum: ["draft", "published", "scheduled"], default: "draft" },
    publishDate: { type: String, default: "" },
    allowComments: { type: Boolean, default: true },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },

    metaTitle: { type: String, default: "" },
    metaKeywords: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaRobots: { type: String, default: DEFAULT_ROBOTS },
    xRobotsTag: { type: String, default: DEFAULT_ROBOTS },
    authorName: { type: String, default: "" },

    faqs: { type: [FaqItemSchema], default: [] },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
