// pages/api/admin/reports/partner-sales/[partnerId].js
// Order history of one buyer (partner or customer) for the sales report detail page.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "reports.partner_sales");
    if (!admin) return;

    const { partnerId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: "Invalid buyer id" });
    }

    const partner = await User.findById(partnerId, {
      name: 1, companyName: 1, memberId: 1, email: 1, phone: 1, userType: 1,
      city: 1, state: 1, pinCode: 1, gstNumber: 1, businessAddress: 1, createdAt: 1,
    }).lean();
    if (!partner) return res.status(404).json({ message: "Buyer not found" });

    const orders = await Order.find({ user: partnerId })
      .sort({ createdAt: -1 })
      .select("orderNumber orderName total subtotal gstAmount coupon status createdAt items paymentMethod paymentStatus deliveredAt")
      .lean();

    // Fill product names for items saved before productName existed
    const missing = [...new Set(orders.flatMap((o) => (o.items || []).filter((i) => !i.productName).map((i) => String(i.product))))];
    const products = missing.length ? await Product.find({ _id: { $in: missing } }, { name: 1 }).lean() : [];
    const names = new Map(products.map((p) => [String(p._id), p.name]));

    const slim = orders.map((o) => ({
      _id: String(o._id),
      orderNumber: o.orderNumber,
      orderName: o.orderName || "",
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt || null,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      subtotal: Number(o.subtotal) || 0,
      gstAmount: Number(o.gstAmount) || 0,
      discount: Number(o.coupon?.discountAmount) || 0,
      couponCode: o.coupon?.code || "",
      total: Number(o.total) || 0,
      items: (o.items || []).map((i) => ({
        productId: String(i.product),
        productName: i.productName || names.get(String(i.product)) || "Deleted product",
        quantity: Number(i.quantity) || 0,
        price: Number(i.price) || 0,
      })),
    }));

    return res.status(200).json({ partner, orders: slim });
  } catch (err) {
    console.error("Buyer sales detail error:", err);
    return res.status(500).json({ message: "Could not load buyer details" });
  }
}
