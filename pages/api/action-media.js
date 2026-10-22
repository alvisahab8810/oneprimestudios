// What the managed areas of the website read: the home page "See it in Action"
// slider, the home page banners and the products page notices. Public, read-only.
import dbConnect from "@/lib/dbConnect";
import ActionMedia, { sectionQuery } from "@/models/ActionMedia";
import { isSection, DEFAULT_SECTION } from "@/lib/actionMediaRules";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const section = isSection(req.query.section) ? req.query.section : DEFAULT_SECTION;

  try {
    await dbConnect();

    const items = await ActionMedia.find(
      { ...sectionQuery(section), isActive: true },
      { type: 1, src: 1, alt: 1, tag: 1, title: 1, description: 1, link: 1 }
    )
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Re-uploads reuse the slider, so a short cache keeps the homepage quick
    // without holding a removed slide for long.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json({ items });
  } catch (err) {
    console.error("Action media fetch error:", err);
    // The page falls back to its built-in slides rather than breaking
    return res.status(200).json({ items: [] });
  }
}
