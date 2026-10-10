// lib/partnerPincode.js — where a partner's deliveries go, so the rate list can
// quote couriers without asking them to type a pincode they have already given.
// Their profile comes first; failing that, the address their last order shipped to.
import Order from "@/models/Order";

const clean = (value) => {
  const pin = String(value || "").trim();
  return /^\d{6}$/.test(pin) ? pin : "";
};

export default async function resolvePartnerPincode(partner) {
  const fromProfile = clean(partner?.pinCode);
  if (fromProfile) return fromProfile;

  const lastOrder = await Order.findOne({ user: partner?._id, "shipping.zip": { $ne: "" } })
    .sort({ createdAt: -1 })
    .select("shipping.zip")
    .lean();

  return clean(lastOrder?.shipping?.zip);
}
