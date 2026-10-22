



import { sendEmail } from "@/lib/sendEmail";
import { orderStatusTemplate } from "@/lib/emailTemplates";
import dbConnect from "@/lib/dbConnect";

import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";
import Admin from "@/models/Admin";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";

import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission, canViewPayments } from "@/lib/hasPermission";
import { logActivity } from "@/lib/logActivity";
import { canAdminCancelOrder } from "@/lib/orderRules";
import { addHistory } from "@/lib/orderHistory";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  /* ================= AUTH ================= */
  const token = req.cookies.admin_auth;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Load admin / ops user from DB
  const adminUser = await Admin.findById(decoded.id, {
    // The name goes into the order's production log
    name: 1,
    role: 1,
    permissions: 1,
  });

  if (!adminUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = {
    id: adminUser._id,
    role: adminUser.role,
    permissions: adminUser.permissions || [],
  };

  // 🔐 Permission check
  // admin always allowed
  if (!hasPermission(user, "orders")) {
    return res.status(403).json({ message: "No permission" });
  }

  /* ================= VALIDATION ================= */
  const { id } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Order ID" });
  }

  /* ================= GET ORDER ================= */
  if (req.method === "GET") {
    try {
      const order = await Order.findById(id)
        .populate("user", "name email phone userType companyName")
        .populate("items.product", "name mainImage price")
        .lean(); // ✅ keep

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // ✅ Ensure uploadedFiles always exists
      order.uploadedFiles = order.uploadedFiles || [];

      const showPayments = canViewPayments(user);
      if (!showPayments) {
        const orderObj = order.toObject ? order.toObject() : order;
        delete orderObj.paymentMethod;
        delete orderObj.paymentStatus;
        delete orderObj.razorpay;
        return res.status(200).json({ order: orderObj, canViewPayments: false });
      }

      return res.status(200).json({ order, canViewPayments: true });
    } catch (err) {
      console.error("❌ Error fetching order:", err);
      return res.status(500).json({ message: "Failed to fetch order" });
    }
  }

  /* ================= UPDATE ORDER ================= */
  if (req.method === "PUT") {
    try {
      const { status, remarks } = req.body;

      // Cash on delivery money reaches us through the courier, so it is only
      // the payment that changes here — the order status is untouched
      if (req.body.markPaid) {
        if (!canViewPayments(user)) {
          return res.status(403).json({ message: "No permission to record payments" });
        }
        const codOrder = await Order.findById(id);
        if (!codOrder) return res.status(404).json({ message: "Order not found" });
        if (codOrder.paymentMethod !== "COD") {
          return res.status(400).json({ message: "Only a cash on delivery order can be marked paid" });
        }
        if (codOrder.paymentStatus === "PAID") {
          return res.status(400).json({ message: "This order is already marked paid" });
        }

        codOrder.paymentStatus = "PAID";
        await codOrder.save();

        res.status(200).json({ message: "Payment recorded", order: codOrder });

        logActivity(req, "order_cod_collected",
          `Cash on delivery of ₹${codOrder.total} recorded for order #${codOrder.orderNumber || id}`,
          { entity: "order", entityId: id, meta: { orderNumber: codOrder.orderNumber, amount: codOrder.total } }
        );
        return;
      }

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const order = await Order.findById(id)
        .populate("user", "name email userType")
        .populate("items.product", "name");

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (status === "Cancelled" && order.status !== "Cancelled" && !canAdminCancelOrder(order)) {
        return res.status(400).json({ message: `This order is already "${order.status}" and can no longer be cancelled` });
      }

      /* ===== EXISTING STATUS LOGIC (UNCHANGED) ===== */
      const previousStatus = order.status;
      order.status = status;

      // One step in the production log the buyer can follow
      if (previousStatus !== status) {
        addHistory(order, {
          status,
          note: remarks ? String(remarks).slice(0, 300) : "",
          by: adminUser?.name || "Office",
        });
      }

      if (status === "Design Rejected" && remarks) {
        order.remarks = remarks;
      } else if (status !== "Design Rejected") {
        order.remarks = "";
      }

      /* ===== DISPATCH REQUEST FLOW ===== */
      // A dispatch request is part of the partner (B2B) flow only. A retail order
      // ships on its own, so its flag is left at "none" and it never shows up as
      // a dispatch request anywhere.
      const isPartnerOrder =
        String(order.user?.userType || "").toLowerCase() === "partner";

      if (isPartnerOrder) {
        if (status === "Order Ready") {
          order.dispatchRequest = "none";
        }

        if (status === "Order Dispatched") {
          order.dispatchRequest = "approved";
        }
      }

      /* ===== CANCEL + WALLET REFUND ===== */
      if (status === "Cancelled") {
        order.cancelledBy = "admin";

        if (order.paymentMethod === "Wallet" && order.paymentStatus === "PAID") {
          let wallet = await Wallet.findOne({ user: order.user });
          if (!wallet) wallet = await Wallet.create({ user: order.user, balance: 0 });
          wallet.balance += order.total;
          await wallet.save();

          await WalletTransaction.create({
            user: order.user,
            type: "credit",
            amount: order.total,
            // OLD: referenceId was raw ObjectId
            // NEW: referenceId as string for View Order link; description includes product names
            description: `Refund - #${order.orderNumber} (${order.items?.map((i) => i.product?.name || "Product").join(", ") || "Order"})`,
            referenceType: "refund",
            referenceId: order._id.toString(),
            status: "success",
          });

          order.paymentStatus = "REFUNDED";
          order.refundedAt = new Date();
        }
      }

      await order.save();

      // Fire-and-forget activity log
      logActivity(req, "order_status_updated",
        `Order #${order.orderNumber || id} status changed to "${status}"`,
        { entity: "order", entityId: id, meta: { status, orderNumber: order.orderNumber } }
      );

      /* ===== EMAIL LOGIC (UNCHANGED) ===== */
      const emailHtml = orderStatusTemplate({
        name: order.user?.name || order.shipping?.name || "Customer",
        orderNumber: order.orderNumber || order._id,
        status: order.status,
        remarks: order.remarks,
        items: order.items.map((i) => ({
          product: i.product && i.product.name ? i.product : i.product,
          quantity: i.quantity,
          price: i.price,
        })),
        total: order.total,
      });

      // Fire & forget email
      (async () => {
        try {
          await sendEmail({
            to: order.user.email,
            // cc: process.env.ADMIN_EMAIL || "info@viralon.in",
            cc: process.env.ADMIN_EMAIL || "admin@oneprimestudios.com",
            subject: `Update: Your Order ${order.orderNumber} — ${order.status}`,
            html: emailHtml,
          });
        } catch (emailErr) {
          console.error("❌ Failed to send status email:", emailErr);
        }
      })();

      return res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        order,
      });
    } catch (err) {
      console.error("❌ Error updating order:", err);
      return res.status(500).json({ message: "Failed to update order" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
