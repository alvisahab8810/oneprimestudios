// pages/api/orders/reorder/[id].js — Quick Reorder.
// POST puts the items of one of the buyer's own past orders back into their
// cart. Works for both partner (B2B) and retail (B2C) accounts: the partner
// cart holds a single job, so for them the cart is replaced rather than added to.
//
// Prices are taken from the product as it stands today, never from the old
// order, and every line is re-checked against stock and minimum-order rules, so
// a reorder can never revive a stale price or an unavailable product.
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { checkOrderable } from "@/lib/stockRules";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id || "")) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const order = await Order.findById(id).select("user items orderName orderNumber").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const ownerId = order.user?._id || order.user;
    if (String(ownerId) !== String(user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const items = order.items || [];
    if (!items.length) return res.status(400).json({ message: "This order has no items to reorder" });

    const isPartnerCart = user.userType === "partner";

    const lines = [];
    const skipped = [];

    for (const item of items) {
      const productId = item.product?._id || item.product;
      const label = item.productName || "Item";

      if (!productId) {
        skipped.push(`${label} — no longer available`);
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        skipped.push(`${label} — no longer available`);
        continue;
      }

      const quantity = Number(item.quantity) || 1;
      const problem = checkOrderable(product, quantity);
      if (problem) {
        skipped.push(`${product.name || label} — ${problem}`);
        continue;
      }

      lines.push({
        product: product._id,
        quantity,
        selectedAttrs: item.selectedAttrs || {},
        uploadedFiles: item.uploadedFiles || [],
        uploadedAttributeFiles: (item.uploadedAttributeFiles || []).map((f) => ({
          attributeName: f?.attributeName || "",
          name: f?.name || "",
          url: f?.url || "",
        })),
        // Today's price, not the price paid on the old order
        price: Number(product.salePrice ?? product.basePrice ?? 0),
        remarks: item.remarks || "",
        orderName: order.orderName || "",
        createdAt: new Date(),
      });
    }

    if (!lines.length) {
      return res.status(400).json({
        message: "Nothing from this order can be reordered right now",
        skipped,
      });
    }

    let cart = await Cart.findOne({ user: user._id });
    if (!cart) cart = new Cart({ user: user._id, items: [] });

    if (isPartnerCart) {
      // A partner works one job at a time — the reorder becomes the whole cart
      cart.items = lines;
    } else {
      // Retail: the reordered lines are added as their own rows, with the files
      // and options from the old order kept intact
      cart.items.push(...lines);
    }

    await cart.save();
    cart = await cart.populate("items.product");

    return res.status(200).json({
      success: true,
      added: lines.length,
      skipped,
      replacedCart: isPartnerCart,
      items: cart.items,
    });
  } catch (err) {
    console.error("Reorder error:", err);
    return res.status(500).json({ message: "Could not reorder this order" });
  }
}
