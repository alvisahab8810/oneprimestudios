// pages/api/couriers/options.js
// The couriers a partner can pick from on a product page. On the B2B side the
// partner chooses the courier themselves; retail orders are still routed by the
// admin from the dashboard, so this is open to partners only.
//
// Rates are deliberately left out of the answer: a partner is not charged
// transport, so the price belongs with the admin and not on the product page.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import { getLiveCouriers, LIVE_PREFIX } from "@/lib/courierRates";
import { isValidPincode, normalizePincode } from "@/lib/deliveryZones";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.userType !== "partner") {
      return res.status(403).json({ message: "Choosing a courier is available to partners only" });
    }

    const pincode = normalizePincode(req.query.pincode || user.pinCode);
    // No usable PIN code means no list. The product page simply hides the
    // dropdown rather than blocking the order.
    if (!isValidPincode(pincode)) return res.status(200).json({ pincode: "", couriers: [] });

    const live = await getLiveCouriers(pincode);

    // Ids are stored without the live prefix, so the one the partner picked is
    // the same id the admin's shipment panel books with.
    const couriers = live.map((c) => ({
      courierId: String(c._id).replace(LIVE_PREFIX, ""),
      name: c.name,
      etd: c.etd || "",
    }));

    return res.status(200).json({ pincode, couriers });
  } catch (err) {
    console.error("Courier options error:", err);
    return res.status(500).json({ message: "Could not load courier options" });
  }
}
