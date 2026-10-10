// The couriers a partner can pick on the rate list. These come from the live
// Shiprocket account, quoted for the partner's delivery pincode; the couriers
// saved in the admin panel are only used when Shiprocket cannot answer.
import dbConnect from "@/lib/dbConnect";
import RateCourier from "@/models/RateCourier";
import requirePartner from "@/lib/requirePartner";
import { getLiveCouriers } from "@/lib/courierRates";
import resolvePartnerPincode from "@/lib/partnerPincode";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const partner = await requirePartner(req, res);
    if (!partner) return;

    // The partner's own delivery pincode — they never have to type it again
    const pincode = await resolvePartnerPincode(partner);

    const live = await getLiveCouriers(pincode);
    if (live.length) {
      return res.json({
        source: "live",
        pincode,
        couriers: live.map((c) => ({ _id: c._id, name: c.name, etd: c.etd || "" })),
      });
    }

    const saved = await RateCourier.find({ isActive: true })
      .select("name order")
      .sort({ order: 1, name: 1 })
      .lean();

    return res.json({
      source: "saved",
      pincode,
      couriers: saved.map((c) => ({ _id: String(c._id), name: c.name, etd: "" })),
      message: pincode
        ? "Live courier rates are unavailable right now, so standard rates are shown."
        : "Add a delivery pincode to your profile to see live courier rates. Standard rates are shown for now.",
    });
  } catch (err) {
    console.error("Rate list couriers error:", err);
    return res.status(500).json({ message: "Could not load couriers" });
  }
}
