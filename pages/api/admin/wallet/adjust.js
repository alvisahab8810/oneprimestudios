// Admin → add money to, or take money out of, any partner's wallet directly.
// Used for corrections, offline settlements and reversals. Every adjustment
// leaves a statement entry and an activity log line, so nothing is silent.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import User from "@/models/User";

const MAX_ADJUSTMENT = 1000000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "wallet");
  if (!admin) return;

  const { userId } = req.body || {};
  const type = String(req.body?.type || "").trim();
  const reason = String(req.body?.reason || "").trim().slice(0, 300);
  const amount = Number(req.body?.amount);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Choose a partner" });
  }
  if (type !== "credit" && type !== "debit") {
    return res.status(400).json({ message: "Type must be credit or debit" });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Enter an amount greater than zero" });
  }
  if (amount > MAX_ADJUSTMENT) {
    return res.status(400).json({ message: `Amount cannot be more than ₹${MAX_ADJUSTMENT}` });
  }
  if (!reason) {
    return res.status(400).json({ message: "Please write why this adjustment is being made" });
  }

  try {
    // The wallet is a partner feature, so this stays closed to retail accounts
    const partner = await User.findById(userId)
      .select("name companyName email userType")
      .lean();
    if (!partner || partner.userType !== "partner") {
      return res.status(404).json({ message: "Partner not found" });
    }

    const session = await mongoose.startSession();
    let newBalance = 0;

    try {
      await session.withTransaction(async () => {
        if (type === "credit") {
          const wallet = await Wallet.findOneAndUpdate(
            { user: partner._id },
            { $inc: { balance: amount }, $setOnInsert: { user: partner._id } },
            { new: true, upsert: true, session }
          );
          newBalance = wallet.balance;
        } else {
          // A debit only goes through when the balance actually covers it, and
          // the condition is part of the update so two debits cannot race
          const wallet = await Wallet.findOneAndUpdate(
            { user: partner._id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true, session }
          );
          if (!wallet) throw new Error("INSUFFICIENT");
          newBalance = wallet.balance;
        }

        await WalletTransaction.create(
          [
            {
              user: partner._id,
              type,
              amount,
              description: `Admin adjustment: ${reason}`,
              referenceType: "adjustment",
              status: "success",
            },
          ],
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      message:
        type === "credit"
          ? `₹${amount} added to the wallet`
          : `₹${amount} deducted from the wallet`,
      balance: newBalance,
    });

    logActivity(
      req,
      type === "credit" ? "wallet_credited" : "wallet_debited",
      `₹${amount} ${type === "credit" ? "added to" : "deducted from"} the wallet of ${
        partner.companyName || partner.name
      } — ${reason}`,
      {
        entity: "wallet",
        entityId: String(partner._id),
        meta: { amount, type, reason, newBalance },
      }
    );
  } catch (err) {
    if (err?.message === "INSUFFICIENT") {
      return res
        .status(400)
        .json({ message: "The wallet does not have enough balance for this deduction" });
    }
    console.error("Wallet adjustment error:", err);
    return res.status(500).json({ message: "Could not adjust the wallet" });
  }
}
