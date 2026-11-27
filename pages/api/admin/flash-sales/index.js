// pages/api/admin/flash-sales/index.js
// GET  → every flash sale with its current status and product count
// POST → create a flash sale
import dbConnect from "@/lib/dbConnect";
import FlashSale from "@/models/FlashSale";
import { requireAdminPermission } from "@/lib/adminAuth";
import { dealStatus } from "@/lib/flashPricing";
import { readFlashSaleBody } from "@/lib/flashSaleInput";

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "flash_sales");
  if (!admin) return;

  if (req.method === "GET") {
    try {
      const sales = await FlashSale.find({}).sort({ endsAt: -1 }).lean();
      const now = Date.now();
      const data = sales.map((s) => ({
        _id: s._id,
        title: s.title,
        slug: s.slug,
        subtitle: s.subtitle,
        dealPrice: s.dealPrice,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        enabled: s.enabled,
        showOnHome: s.showOnHome,
        productCount: (s.products || []).length,
        status: dealStatus(s, now),
        updatedAt: s.updatedAt,
      }));
      return res.json({ data, serverNow: new Date(now).toISOString() });
    } catch (err) {
      console.error("Flash sale list error:", err);
      return res.status(500).json({ message: "Could not load flash sales" });
    }
  }

  if (req.method === "POST") {
    const { error, value } = await readFlashSaleBody(req.body);
    if (error) return res.status(400).json({ message: error });
    try {
      const taken = await FlashSale.exists({ slug: value.slug });
      if (taken) return res.status(400).json({ message: "Another flash sale already uses this link. Change the link name." });
      const sale = await FlashSale.create(value);
      return res.status(201).json({ success: true, data: sale });
    } catch (err) {
      console.error("Flash sale create error:", err);
      return res.status(500).json({ message: "Could not create the flash sale" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}
