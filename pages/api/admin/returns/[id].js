// pages/api/admin/returns/[id].js
// GET   — one return/refund request with its order
// PATCH — move the request forward: status, remarks, and refund details
import dbConnect from "@/lib/dbConnect";
import ReturnRequest from "@/models/ReturnRequest";
import Order from "@/models/Order";
import Admin from "@/models/Admin";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission, canViewPayments } from "@/lib/hasPermission";
import { RETURN_STATUSES } from "@/lib/returnRules";
import { isRazorpayConfigured, refundPayment } from "@/lib/razorpay";

const MANUAL_METHODS = ["Bank Transfer", "UPI", "Other"];

const getAdmin = async (req) => {
  const token = req.cookies.admin_auth;
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  const admin = await Admin.findById(decoded.id, { role: 1, permissions: 1, name: 1 });
  if (!admin) return null;
  return {
    id: admin._id,
    name: admin.name || "admin",
    role: admin.role,
    permissions: admin.permissions || [],
  };
};

// How much of this order has already been sent back, so we never over-refund.
const alreadyRefunded = (order) =>
  (order?.refunds || [])
    .filter((r) => r.status !== "failed")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

export default async function handler(req, res) {
  await dbConnect();

  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });
  if (!hasPermission(admin, "orders")) {
    return res.status(403).json({ message: "No permission" });
  }

  const { id } = req.query;

  /* ── GET one ───────────────────────────────────────────────────────────── */
  if (req.method === "GET") {
    try {
      const request = await ReturnRequest.findById(id)
        .populate("user", "name email phone userType companyName")
        .populate({
          path: "order",
          select:
            "orderNumber total subtotal gstAmount shippingCharge status paymentMethod paymentStatus razorpay refunds items shipping createdAt deliveredAt",
          populate: { path: "items.product", select: "name slug mainImage images" },
        })
        .lean();

      if (!request) return res.status(404).json({ message: "Request not found" });

      const order = request.order;
      const showPayments = canViewPayments(admin);

      // What the refund form needs to know, without exposing raw payment ids
      request.refundContext = {
        canRefundAtGateway: Boolean(
          showPayments && isRazorpayConfigured() && order?.razorpay?.paymentId
        ),
        alreadyRefunded: order ? alreadyRefunded(order) : 0,
        refundable: order ? Math.max(Number(order.total || 0) - alreadyRefunded(order), 0) : 0,
      };

      if (!showPayments && order) {
        delete order.paymentMethod;
        delete order.paymentStatus;
        delete order.razorpay;
        delete order.refunds;
      } else if (order?.razorpay) {
        // The id itself is not needed in the browser
        delete order.razorpay.signature;
      }

      return res.status(200).json({ success: true, data: request });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  /* ── PATCH: advance the request ────────────────────────────────────────── */
  if (req.method === "PATCH") {
    try {
      const request = await ReturnRequest.findById(id);
      if (!request) return res.status(404).json({ message: "Request not found" });

      const { status, adminRemarks, refundAmount, refundMethod, refundReference, refundNote } =
        req.body || {};

      if (status && !RETURN_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      if (status && status !== request.status && !(RETURN_STATUSES.includes(request.status))) {
        return res.status(400).json({ message: "Invalid current status" });
      }
      if (typeof adminRemarks === "string") request.adminRemarks = adminRemarks.trim();

      const order = await Order.findById(request.order);

      if (status === "Refunded") {
        if (!canViewPayments(admin)) {
          return res.status(403).json({ message: "You are not allowed to record refunds" });
        }
        if (!order) return res.status(400).json({ message: "The order for this request is missing" });
        if (request.refund?.refundedAt && request.refund?.status !== "failed") {
          return res.status(409).json({ message: "This request has already been refunded" });
        }

        const amount = Number(refundAmount ?? request.refund?.amount ?? order.total ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ message: "Refund amount must be greater than zero" });
        }

        const remaining = Number(order.total || 0) - alreadyRefunded(order);
        if (amount > remaining + 0.01) {
          return res.status(400).json({
            message: `Only ₹${remaining.toFixed(2)} of this order is left to refund`,
          });
        }

        const method = refundMethod;
        const paymentId = order.razorpay?.paymentId || "";
        let reference = String(refundReference || "").trim();
        let refundStatus = "processed";
        let note = String(refundNote || "").trim();

        if (method === "Razorpay") {
          if (!isRazorpayConfigured()) {
            return res.status(500).json({ message: "Razorpay is not configured on the server" });
          }
          if (!paymentId) {
            return res.status(400).json({
              message:
                "This order has no Razorpay payment on file. Refund it from the Razorpay dashboard and record it as Bank Transfer / UPI with the reference.",
            });
          }
          try {
            const refund = await refundPayment({
              paymentId,
              amountRupees: amount,
              notes: { returnRequest: request.requestNumber, orderNumber: order.orderNumber || "" },
              receipt: request.requestNumber,
            });
            reference = refund.id;
            // Razorpay settles refunds over the next few days
            refundStatus = refund.status === "processed" ? "processed" : "pending";
          } catch (err) {
            return res.status(400).json({
              message: `Razorpay refused the refund: ${err?.error?.description || err.message}`,
            });
          }
        } else if (method === "Wallet") {
          // Store credit — only meaningful for accounts that have a wallet
          const wallet = await Wallet.findOne({ user: request.user });
          if (!wallet) {
            return res.status(400).json({ message: "This customer has no wallet to credit" });
          }
          wallet.balance += amount;
          await wallet.save();
          const txn = await WalletTransaction.create({
            user: request.user,
            type: "credit",
            amount,
            description: `Refund for order #${order.orderNumber || ""} (${request.requestNumber})`,
            referenceType: "refund",
            referenceId: String(order._id),
            status: "success",
          });
          reference = String(txn._id);
        } else if (MANUAL_METHODS.includes(method)) {
          if (!reference) {
            return res.status(400).json({ message: "Please enter a reference / UTR number" });
          }
          note = [note, `Recorded manually by ${admin.name}`].filter(Boolean).join(" · ");
        } else {
          return res.status(400).json({ message: "Please choose how the refund was sent" });
        }

        request.refund = {
          amount,
          method,
          reference,
          status: refundStatus,
          refundedAt: new Date(),
          failureReason: "",
          note,
        };

        order.refunds.push({
          returnRequest: request._id,
          amount,
          method,
          reference,
          status: refundStatus,
          note,
          createdAt: new Date(),
          settledAt: refundStatus === "processed" ? new Date() : undefined,
        });

        // Fully refunded orders are marked REFUNDED; a part refund keeps PAID
        const refundedTotal = alreadyRefunded(order);
        if (refundedTotal + 0.01 >= Number(order.total || 0)) {
          order.paymentStatus = "REFUNDED";
        }
        order.refundedAt = new Date();
      } else if (refundAmount !== undefined && canViewPayments(admin)) {
        // Admin may adjust the expected amount before the money goes out
        const next = Number(refundAmount);
        if (Number.isFinite(next) && next >= 0) {
          request.refund = { ...(request.refund?.toObject?.() || request.refund || {}), amount: next };
        }
      }

      if (status && status !== request.status) {
        request.status = status;
        request.history.push({
          status,
          remarks: String(adminRemarks || "").trim(),
          by: admin.role === "admin" ? "admin" : admin.role,
          at: new Date(),
        });
        if (order) order.returnStatus = status;
      }

      await request.save();
      if (order) await order.save();

      return res.status(200).json({ success: true, data: request });
    } catch (err) {
      console.error("Return request update error:", err);
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
