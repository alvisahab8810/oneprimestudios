



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
import { hasPermission } from "@/lib/hasPermission";
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

      return res.status(200).json({ order });
    } catch (err) {
      console.error("❌ Error fetching order:", err);
      return res.status(500).json({ message: "Failed to fetch order" });
    }
  }

  /* ================= UPDATE ORDER ================= */
  if (req.method === "PUT") {
    try {
      const { status, remarks } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const order = await Order.findById(id)
        .populate("user", "name email")
        .populate("items.product", "name");

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      /* ===== EXISTING STATUS LOGIC (UNCHANGED) ===== */
      order.status = status;

      if (status === "Design Rejected" && remarks) {
        order.remarks = remarks;
      } else if (status !== "Design Rejected") {
        order.remarks = "";
      }

      /* ===== DISPATCH REQUEST FLOW (UNCHANGED) ===== */
      if (status === "Order Ready") {
        order.dispatchRequest = "none";
      }

      if (status === "Order Dispatched") {
        order.dispatchRequest = "approved";
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
            description: `Refund - Admin cancelled Order #${order.orderNumber}`,
            referenceType: "refund",
            referenceId: order._id,
            status: "success",
          });

          order.paymentStatus = "REFUNDED";
          order.refundedAt = new Date();
        }
      }

      await order.save();

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
