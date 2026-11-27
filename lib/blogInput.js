// lib/blogInput.js — turns the admin editor payload into safe Blog fields.
import { resolveImageField } from "@/lib/blogImages";

const STATUSES = ["draft", "published", "scheduled"];

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const str = (v, max = 100000) => String(v ?? "").slice(0, max);

const list = (v) => {
  const arr = Array.isArray(v) ? v : String(v || "").split(",");
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))].slice(0, 30);
};

// Returns { data } or { error }
export function buildBlogData(body = {}) {
  const title = str(body.title, 200).trim();
  if (!title) return { error: "Title is required." };
  const slug = slugify(body.slug || title);
  if (!slug) return { error: "Slug is required." };

  let coverImage;
  let cardImage;
  try {
    coverImage = resolveImageField(body.coverImage, `${slug}-cover`);
    cardImage = resolveImageField(body.cardImage, `${slug}-card`);
  } catch (err) {
    return { error: err.message };
  }

  const schemas = Array.isArray(body.schemas)
    ? body.schemas
        .map((s) => ({ type: str(s?.type, 60) || "BlogPosting", content: str(s?.content, 50000) }))
        .filter((s) => s.content.trim())
        .slice(0, 10)
    : [];

  const faqs = Array.isArray(body.faqs)
    ? body.faqs
        .map((f) => ({ question: str(f?.question, 500).trim(), answer: str(f?.answer, 5000).trim() }))
        .filter((f) => f.question && f.answer)
        .slice(0, 30)
    : [];

  const status = STATUSES.includes(body.status) ? body.status : "draft";

  return {
    data: {
      title,
      slug,
      coverImage,
      cardImage,
      content: str(body.content, 500000),
      summary: str(body.summary, 500),
      schemas,
      schema: schemas[0]?.content || "",
      schemaType: schemas[0]?.type || "BlogPosting",
      status,
      publishDate: str(body.publishDate, 40),
      allowComments: body.allowComments !== false,
      categories: list(body.categories),
      tags: list(body.tags),
      metaTitle: str(body.metaTitle, 200),
      metaKeywords: str(body.metaKeywords, 500),
      metaDescription: str(body.metaDescription, 300),
      metaRobots: str(body.metaRobots, 200),
      xRobotsTag: str(body.xRobotsTag, 200),
      authorName: str(body.authorName, 100),
      faqs,
    },
  };
}
