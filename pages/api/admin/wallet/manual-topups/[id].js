// Admin → approve or reject one manual wallet top-up request.
// Approving is the only thing in this feature that moves money, so it runs in
// a transaction and refuses anything that is not still pending.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import WalletTopupRequest from "@/models/WalletTopupRequest";
import WalletTransaction from "@/models/WalletTransaction";
import Wallet from "@/models/Wallet";
// Imported so the User model is registered before populate() runs
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "wallet");
  if (!admin) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid request id" });
  }

  const action = String(req.body?.action || "").trim();
  const remarks = String(req.body?.remarks || "").trim().slice(0, 500);

  if (!["approve", "reject", "refund"].includes(action)) {
    return res
      .status(400)
      .json({ message: "Action must be approve, reject or refund" });
  }

  try {
    const request = await WalletTopupRequest.findById(id).populate(
      "user",
      "name companyName email userType"
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    /* ── REFUND: the money has been sent back from the bank ──────────── */
    // Allowed from any state but a refund that already happened. An approved
    // request also has to give the credited amount back, or the partner would
    // keep the balance as well as the money.
    if (action === "refund") {
      if (request.status === "refunded") {
        return res.status(400).json({ message: "This request was already refunded" });
      }
      if (!remarks) {
        return res.status(400).json({
          message: "Please write a note so the partner knows about the refund",
        });
      }

      const amount = Number(req.body?.refundAmount ?? request.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "Enter a refund amount greater than zero" });
      }
      if (amount > request.amount) {
        return res.status(400).json({
          message: `The refund cannot be more than the ₹${request.amount} paid`,
        });
      }

      const refundedFrom = request.status;
      const refund = {
        amount,
        mode: String(req.body?.refundMode || "").trim().slice(0, 40),
        reference: String(req.body?.refundReference || "").trim().slice(0, 100),
        remarks,
        refundedFrom,
        at: new Date(),
        by: admin.id,
        walletTransaction: null,
      };

      // Only an approved request ever put money into the wallet
      if (refundedFrom === "approved") {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const claimed = await WalletTopupRequest.findOneAndUpdate(
              { _id: request._id, status: "approved" },
              { $set: { status: "refunded", refund } },
              { new: true, session }
            );
            if (!claimed) throw new Error("ALREADY_PROCESSED");

            // The condition is part of the update so two refunds cannot race
            const wallet = await Wallet.findOneAndUpdate(
              { user: request.user?._id || request.user, balance: { $gte: amount } },
              { $inc: { balance: -amount } },
              { new: true, session }
            );
            if (!wallet) throw new Error("INSUFFICIENT");

            const [txn] = await WalletTransaction.create(
              [
                {
                  user: request.user?._id || request.user,
                  type: "debit",
                  amount,
                  description: `Wallet top-up refunded to bank (${request.requestNumber})`,
                  referenceType: "refund",
                  referenceId: request.requestNumber,
                  status: "success",
                },
              ],
              { session }
            );

            await WalletTopupRequest.updateOne(
              { _id: request._id },
              { $set: { "refund.walletTransaction": txn._id } },
              { session }
            );
          });
        } finally {
          await session.endSession();
        }
      } else {
        const claimed = await WalletTopupRequest.findOneAndUpdate(
          { _id: request._id, status: refundedFrom },
          { $set: { status: "refunded", refund } },
          { new: true }
        );
        if (!claimed) throw new Error("ALREADY_PROCESSED");
      }

      const refunded = await WalletTopupRequest.findById(id)
        .populate("user", "name companyName email")
        .lean();

      res.status(200).json({
        message: `₹${amount} marked as refunded`,
        request: refunded,
      });

      logActivity(
        req,
        "wallet_topup_refunded",
        `Manual top-up ${request.requestNumber} refunded ₹${amount} to ${
          request.user?.companyName || request.user?.name || "partner"
        }`,
        {
          entity: "wallet_topup",
          entityId: String(request._id),
          meta: {
            amount,
            refundedFrom,
            reference: refund.reference,
            walletDebited: refundedFrom === "approved",
          },
        }
      );
      return;
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: `This request was already ${request.status}`,
      });
    }

    /* ── REJECT: nothing moves, the partner just gets told why ───────── */
    if (action === "reject") {
      if (!remarks) {
        return res.status(400).json({
          message: "Please give a reason so the partner knows what to fix",
        });
      }

      request.status = "rejected";
      request.adminRemarks = remarks;
      request.reviewedBy = admin.id;
      request.reviewedAt = new Date();
      await request.save();

      res.status(200).json({ message: "Request rejected", request });

      logActivity(
        req,
        "wallet_topup_rejected",
        `Manual top-up ${request.requestNumber} of ₹${request.amount} rejected`,
        {
          entity: "wallet_topup",
          entityId: String(request._id),
          meta: { amount: request.amount, reason: remarks },
        }
      );
      return;
    }

    /* ── APPROVE: credit the wallet and write the statement entry ─────── */
    const session = await mongoose.startSession();
    let creditedBalance = 0;
    let txnId = null;

    try {
      await session.withTransaction(async () => {
        // Re-read inside the transaction so two admins cannot both approve
        const fresh = await WalletTopupRequest.findOneAndUpdate(
          { _id: request._id, status: "pending" },
          {
            $set: {
              status: "approved",
              adminRemarks: remarks,
              reviewedBy: admin.id,
              reviewedAt: new Date(),
            },
          },
          { new: true, session }
        );
        if (!fresh) {
          throw new Error("ALREADY_PROCESSED");
        }

        const [txn] = await WalletTransaction.create(
          [
            {
              user: fresh.user,
              type: "credit",
              amount: fresh.amount,
              description: `Manual wallet top-up (${fresh.paymentMode} · ${fresh.referenceNumber})`,
              referenceType: "wallet_topup",
              referenceId: fresh.referenceNumber,
              status: "success",
            },
          ],
          { session }
        );
        txnId = txn._id;

        const wallet = await Wallet.findOneAndUpdate(
          { user: fresh.user },
          { $inc: { balance: fresh.amount }, $setOnInsert: { user: fresh.user } },
          { new: true, upsert: true, session }
        );
        creditedBalance = wallet.balance;

        await WalletTopupRequest.updateOne(
          { _id: fresh._id },
          { $set: { walletTransaction: txn._id } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    const updated = await WalletTopupRequest.findById(id)
      .populate("user", "name companyName email")
      .lean();

    res.status(200).json({
      message: `₹${request.amount} added to the wallet`,
      request: updated,
      balance: creditedBalance,
      transactionId: txnId,
    });

    logActivity(
      req,
      "wallet_topup_approved",
      `Manual top-up ${request.requestNumber} of ₹${request.amount} approved for ${
        request.user?.companyName || request.user?.name || "partner"
      }`,
      {
        entity: "wallet_topup",
        entityId: String(request._id),
        meta: {
          amount: request.amount,
          reference: request.referenceNumber,
          newBalance: creditedBalance,
        },
      }
    );
  } catch (err) {
    if (err?.message === "ALREADY_PROCESSED") {
      return res.status(400).json({ message: "This request was already processed" });
    }
    if (err?.message === "INSUFFICIENT") {
      return res.status(400).json({
        message:
          "The partner has already spent this money — deduct it from the wallet first, then mark the refund",
      });
    }
    console.error("Manual top-up review error:", err);
    return res.status(500).json({ message: "Could not process this request" });
  }
}
