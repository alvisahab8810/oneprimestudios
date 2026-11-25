// pages/api/delivery/estimate.js
// GET ?productId=&pincode= — the estimated delivery date shown to a retail
// buyer on the product page. Public, because the date has to be visible before
// anyone logs in.
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { B2B, resolveAudience } from "@/lib/audience";
import { getLiveCouriers } from "@/lib/courierRates";
import { deliveryStatus, isValidPincode, normalizePincode } from "@/lib/deliveryZones";
import { buildEstimate, formatEstimateRange, productDispatchDays, transitRange } from "@/lib/deliveryEstimate";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  // Estimates are a retail feature; partners arrange dispatch with the admin
  if (resolveAudience(req, req.query.userType) === B2B) {
    return res.status(200).json({ estimate: null });
  }

  const productId = String(req.query.productId || "");
  if (!/^[a-f0-9]{24}$/i.test(productId)) {
    return res.status(400).json({ message: "A valid productId is required" });
  }

  try {
    await dbConnect();

    const product = await Product.findById(productId).lean();
    if (!product || product.status !== "published" || product.productFor === "b2b") {
      return res.status(404).json({ message: "Product not found" });
    }

    const pincode = normalizePincode(req.query.pincode);
    const hasPincode = isValidPincode(pincode);

    // No date is promised for a PIN code the product is not delivered to
    if (hasPincode && !deliveryStatus(product, pincode).serviceable) {
      return res.status(200).json({ estimate: null, pincode, serviceable: false });
    }

    // The courier's own delivery dates for this PIN code, when they can be asked
    let etds = [];
    if (hasPincode) {
      const couriers = await getLiveCouriers(pincode);
      etds = couriers.map((c) => c.etd);
    }

    const estimate = buildEstimate({
      dispatchDays: productDispatchDays(product),
      transit: transitRange(etds),
    });

    return res.status(200).json({
      pincode: hasPincode ? pincode : "",
      serviceable: true,
      estimate: { ...estimate, label: formatEstimateRange(estimate) },
    });
  } catch (err) {
    console.error("Delivery estimate error:", err);
    return res.status(500).json({ message: "Could not work out a delivery date" });
  }
}
