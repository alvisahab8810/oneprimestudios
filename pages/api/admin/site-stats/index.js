import dbConnect from "@/lib/dbConnect";
import SiteStat from "@/models/SiteStat";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import { parseStatBody } from "@/lib/siteStatsInput";
import { ensureDefaultSiteStats } from "@/lib/siteStatsSeed";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "site_stats");
  if (!admin) return;

  if (req.method === "GET") {
    try {
      await ensureDefaultSiteStats();
      const stats = await SiteStat.find({ deleted: { $ne: true } })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      return res.json(stats);
    } catch {
      return res.status(500).json({ message: "Failed to load stats" });
    }
  }

  if (req.method === "POST") {
    try {
      // The strip holds one stat at a time: the existing one is edited, and a
      // new one can only be added once it has been deleted.
      if (await SiteStat.exists({ deleted: { $ne: true } })) {
        return res.status(400).json({
          message: "A stat already exists. Edit it, or delete it first to add a new one.",
        });
      }

      const { data, error } = parseStatBody(req.body);
      if (error) return res.status(400).json({ message: error });

      const stat = await SiteStat.create(data);
      res.status(201).json(stat);
      logActivity(req, "site_stat_created", `Stat "${stat.label}" added`, {
        entity: "site_stat",
        entityId: String(stat._id),
        meta: { label: stat.label, value: stat.value },
      });
      return;
    } catch (err) {
      console.error("Create site stat error:", err);
      return res.status(500).json({ message: "Failed to save stat" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
