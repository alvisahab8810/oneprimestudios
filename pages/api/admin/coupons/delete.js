import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import { requireAdminPermission } from "@/lib/adminAuth";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await requireAdminPermission(req, res, "coupons");
  if (!admin) return;

  if (req.method !== "DELETE") return res.status(405).end();

  const { id } = req.body;

  try {
    // A coupon that was used on any order is kept so its usage history stays intact
    const coupon = await Coupon.findById(id, { usedCount: 1 });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    if (coupon.usedCount > 0) {
      return res.status(400).json({ message: "Cannot delete a coupon that has been used. Deactivate it instead." });
    }
    await Coupon.findByIdAndDelete(id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
}
