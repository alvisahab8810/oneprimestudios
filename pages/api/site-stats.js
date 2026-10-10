import dbConnect from "@/lib/dbConnect";
import SiteStat from "@/models/SiteStat";
import { toPublicStat } from "@/lib/siteStats";
import { ensureDefaultSiteStats } from "@/lib/siteStatsSeed";

// Public read for the stats strip. Only active stats are returned, and the
// growth maths is done here so every visitor sees the same figure.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    await ensureDefaultSiteStats();
    const stats = await SiteStat.find({ isActive: true, deleted: { $ne: true } })
      .sort({ order: 1, createdAt: 1 })
      // The strip holds one stat
      .limit(1)
      .lean();

    const now = Date.now();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json(stats.map((s) => toPublicStat(s, now)));
  } catch (err) {
    console.error("Site stats error:", err);
    return res.status(500).json({ message: "Failed to load stats" });
  }
}
