import dbConnect from "@/lib/dbConnect";
import SiteStat from "@/models/SiteStat";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import { parseStatBody } from "@/lib/siteStatsInput";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "site_stats");
  if (!admin) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { data, error } = parseStatBody(req.body);
      if (error) return res.status(400).json({ message: error });

      const stat = await SiteStat.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!stat) return res.status(404).json({ message: "Stat not found" });

      res.json(stat);
      logActivity(req, "site_stat_updated", `Stat "${stat.label}" updated`, {
        entity: "site_stat",
        entityId: String(stat._id),
        meta: { label: stat.label, value: stat.value },
      });
      return;
    } catch (err) {
      console.error("Update site stat error:", err);
      return res.status(500).json({ message: "Failed to update stat" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const stat = await SiteStat.findById(id);
      if (!stat) return res.status(404).json({ message: "Stat not found" });

      if (stat.key) {
        // The stat the site ships with is kept as a record, otherwise the seed
        // would simply add it again on the next page load
        stat.deleted = true;
        stat.isActive = false;
        await stat.save();
      } else {
        await SiteStat.findByIdAndDelete(id);
      }

      res.json({ success: true });
      logActivity(req, "site_stat_deleted", `Stat "${stat.label}" deleted`, {
        entity: "site_stat",
        entityId: String(id),
        meta: { label: stat.label },
      });
      return;
    } catch {
      return res.status(500).json({ message: "Failed to delete stat" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
