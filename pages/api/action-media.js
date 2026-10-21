// What the homepage "See it in Action" slider reads. Public and read-only.
import dbConnect from "@/lib/dbConnect";
import ActionMedia from "@/models/ActionMedia";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const items = await ActionMedia.find(
      { isActive: true },
      { type: 1, src: 1, alt: 1 }
    )
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Re-uploads reuse the slider, so a short cache keeps the homepage quick
    // without holding a removed slide for long.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json({ items });
  } catch (err) {
    console.error("Action media fetch error:", err);
    // The homepage falls back to its built-in slides rather than breaking
    return res.status(200).json({ items: [] });
  }
}
