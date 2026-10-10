import dbConnect from "@/lib/dbConnect";
import RateCourier from "@/models/RateCourier";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import { parseCourierBody } from "@/lib/rateList";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "rate_couriers");
  if (!admin) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { data, error } = parseCourierBody(req.body);
      if (error) return res.status(400).json({ message: error });

      const courier = await RateCourier.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!courier) return res.status(404).json({ message: "Courier not found" });

      res.json(courier);
      logActivity(req, "rate_courier_updated", `Courier "${courier.name}" updated`, {
        entity: "rate_courier",
        entityId: String(courier._id),
        meta: { name: courier.name, baseCharge: courier.baseCharge, perKg: courier.perKg },
      });
      return;
    } catch (err) {
      console.error("Update courier error:", err);
      return res.status(500).json({ message: "Failed to update courier" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const courier = await RateCourier.findByIdAndDelete(id);
      if (!courier) return res.status(404).json({ message: "Courier not found" });

      res.json({ message: "Courier deleted" });
      logActivity(req, "rate_courier_deleted", `Courier "${courier.name}" deleted`, {
        entity: "rate_courier",
        entityId: String(id),
        meta: { name: courier.name },
      });
      return;
    } catch (err) {
      console.error("Delete courier error:", err);
      return res.status(500).json({ message: "Failed to delete courier" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
