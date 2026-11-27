// pages/api/flash-sales/[slug].js
// GET → one flash sale by its link. Products are listed only while the deal is
// live; before it starts or after it ends only the status and times are sent.
import dbConnect from "@/lib/dbConnect";
import FlashSale from "@/models/FlashSale";
import { resolveAudience, B2B } from "@/lib/audience";
import { dealStatus } from "@/lib/flashPricing";
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
  const slug = String(req.query.slug || "").toLowerCase().slice(0, 80);

  try {
    const sale = await FlashSale.findOne({ slug }).lean();
    if (!sale || resolveAudience(req, req.query.userType) === B2B) {
      return res.status(404).json({ message: "Deal not found", serverNow });
    }

    const status = dealStatus(sale, now.getTime());
    const base = {
      title: sale.title,
      slug: sale.slug,
      subtitle: sale.subtitle || "",
      dealPrice: sale.dealPrice,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
    };
    if (status !== "live") {
      // A switched-off deal looks the same as an ended one to shoppers
      return res.json({ data: { ...base, status: status === "scheduled" ? "scheduled" : "ended", products: [] }, serverNow });
    }

    const data = await publicSale(sale, { limit: 0 });
    return res.json({ data: { ...data, status }, serverNow });
  } catch (err) {
    console.error("Flash sale page error:", err);
    return res.status(500).json({ message: "Could not load the deal", serverNow });
  }
}
