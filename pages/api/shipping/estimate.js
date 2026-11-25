// pages/api/shipping/estimate.js
// Tells the checkout page what the courier will charge for the customer's cart
// at a given pincode. The cart is read from the database, never from the browser,
// and the same quote is worked out again when the order is placed.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { quoteShipping, shippingQuoteMessage } from "@/lib/shippingQuote";
import { getLiveCouriers } from "@/lib/courierRates";
import { buildEstimate, cartDispatchDays, formatEstimateRange, transitRange } from "@/lib/deliveryEstimate";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const zip = String(req.body?.zip || "").trim();

    const cart = await Cart.findOne({ user: user._id }).populate({
      path: "items.product",
      select: "name shipping freeDelivery freeDeliveryPincodes dispatchDays",
      model: Product,
    });
    const items = cart?.items || [];

    const declaredValue = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );

    const quote = await quoteShipping({ items, deliveryPincode: zip, declaredValue });

    // Retail buyers are told when the whole cart should arrive. The courier
    // lookup is cached, and when it cannot answer the default transit time
    // is used, so the charge above is never held up by it.
    let estimatedDelivery = null;
    if (user.userType === "customer" && quote.available && items.length) {
      let etds = [];
      try {
        etds = (await getLiveCouriers(zip)).map((c) => c.etd);
      } catch (err) {
        console.error("Delivery estimate courier lookup error:", err?.message);
      }
      if (!etds.length && quote.etd) etds = [quote.etd];
      const estimate = buildEstimate({
        dispatchDays: cartDispatchDays(items.map((i) => i.product)),
        transit: transitRange(etds),
      });
      estimatedDelivery = { ...estimate, label: formatEstimateRange(estimate) };
    }

    return res.status(200).json({
      estimatedDelivery,
      serviceable: quote.available,
      charge: quote.charge,
      freeDelivery: !!quote.freeDelivery,
      courierName: quote.courierName || "",
      etd: quote.etd || "",
      weight: quote.weight,
      message: quote.available ? "" : shippingQuoteMessage(quote.reason),
    });
  } catch (err) {
    console.error("Shipping estimate error:", err);
    return res.status(500).json({ message: "Could not calculate delivery charges" });
  }
}
