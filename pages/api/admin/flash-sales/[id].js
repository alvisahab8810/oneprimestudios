// pages/api/admin/flash-sales/[id].js
// GET    → one flash sale with its products filled in, for the editor
// PUT    → save changes (changing the times restarts or ends the deal)
// DELETE → remove the flash sale
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import FlashSale from "@/models/FlashSale";
import "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";
import { dealStatus } from "@/lib/flashPricing";
import { readFlashSaleBody } from "@/lib/flashSaleInput";

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "flash_sales");
  if (!admin) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id || "")) return res.status(400).json({ message: "Invalid flash sale id" });

  try {
    if (req.method === "GET") {
      const sale = await FlashSale.findById(id)
        .populate("products.product", "name slug mainImage basePrice salePrice minOrderQty productFor status")
        .lean();
      if (!sale) return res.status(404).json({ message: "Flash sale not found" });
      return res.json({
        data: {
          ...sale,
          // A product deleted since it was added is dropped from the editor
          products: (sale.products || []).filter((p) => p.product),
          status: dealStatus(sale),
        },
        serverNow: new Date().toISOString(),
      });
    }

    if (req.method === "PUT") {
      const { error, value } = await readFlashSaleBody(req.body);
      if (error) return res.status(400).json({ message: error });
      const taken = await FlashSale.exists({ slug: value.slug, _id: { $ne: id } });
      if (taken) return res.status(400).json({ message: "Another flash sale already uses this link. Change the link name." });
      const sale = await FlashSale.findByIdAndUpdate(id, { $set: value }, { new: true, runValidators: true }).lean();
      if (!sale) return res.status(404).json({ message: "Flash sale not found" });
      return res.json({ success: true, data: { ...sale, status: dealStatus(sale) } });
    }

    if (req.method === "DELETE") {
      const gone = await FlashSale.findByIdAndDelete(id).lean();
      if (!gone) return res.status(404).json({ message: "Flash sale not found" });
      return res.json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Flash sale error:", err);
    return res.status(500).json({ message: "Could not process the flash sale" });
  }
}
