import dbConnect from "@/lib/dbConnect";
import RateCourier from "@/models/RateCourier";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import { parseCourierBody } from "@/lib/rateList";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "rate_couriers");
  if (!admin) return;

  if (req.method === "GET") {
    try {
      const couriers = await RateCourier.find({}).sort({ order: 1, name: 1 }).lean();
      return res.json(couriers);
    } catch {
      return res.status(500).json({ message: "Failed to load couriers" });
    }
  }

  if (req.method === "POST") {
    try {
      const { data, error } = parseCourierBody(req.body);
      if (error) return res.status(400).json({ message: error });

      const courier = await RateCourier.create(data);
      res.status(201).json(courier);
      logActivity(req, "rate_courier_created", `Courier "${courier.name}" added`, {
        entity: "rate_courier",
        entityId: String(courier._id),
        meta: { name: courier.name, baseCharge: courier.baseCharge, perKg: courier.perKg },
      });
      return;
    } catch (err) {
      console.error("Create courier error:", err);
      return res.status(500).json({ message: "Failed to save courier" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
