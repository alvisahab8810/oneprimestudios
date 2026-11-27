// pages/api/flash-sales/live.js
// GET ?home=1&limit=12 → the flash sales running right now, for retail shoppers.
// Partners (B2B) always get an empty list.
import dbConnect from "@/lib/dbConnect";
import FlashSale from "@/models/FlashSale";
import { resolveAudience, B2B } from "@/lib/audience";
import { publicSale } from "@/lib/flashSalePublic";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  res.setHeader("Cache-Control", "no-store");

  const now = new Date();
  const serverNow = now.toISOString();
  if (resolveAudience(req, req.query.userType) === B2B) return res.json({ data: [], serverNow });

  try {
    const filter = { enabled: true, startsAt: { $lte: now }, endsAt: { $gt: now } };
    if (req.query.home === "1") filter.showOnHome = true;
    const limit = Math.min(48, Math.max(0, parseInt(req.query.limit, 10) || 12));

    const sales = await FlashSale.find(filter).sort({ endsAt: 1 }).limit(5).lean();
    const data = (await Promise.all(sales.map((s) => publicSale(s, { limit })))).filter((s) => s.products.length);
    return res.json({ data, serverNow });
  } catch (err) {
    console.error("Live flash sales error:", err);
    return res.status(500).json({ message: "Could not load deals", data: [], serverNow });
  }
}
