// pages/api/admin/payment-accounts/[id].js
// PUT: edit an account, or { show: true } to make it the one partners see.
// DELETE: remove it. If it was the shown one, the most recently edited
// remaining account takes its place (or the built-in details, if none is left).
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import PaymentAccount from "@/models/PaymentAccount";
import { readAccountBody } from "@/lib/paymentAccounts";

// Removes a QR picture this screen uploaded, once nothing uses it any more
async function dropUnusedQr(src) {
  if (!src || !src.startsWith("/uploads/payment-qr/")) return;
  const stillUsed = await PaymentAccount.exists({ qrImage: src });
  if (stillUsed) return;
  const file = path.join(process.cwd(), "public", src);
  fs.unlink(file, () => {});
}

export default async function handler(req, res) {
  await dbConnect();
  const me = await requireAdminPermission(req, res, "wallet");
  if (!me) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid account id" });

  const doc = await PaymentAccount.findById(id);
  if (!doc) return res.status(404).json({ message: "Account not found" });

  if (req.method === "PUT") {
    if (req.body?.show === true) {
      await PaymentAccount.updateMany({ _id: { $ne: doc._id }, isActive: true }, { $set: { isActive: false } });
      doc.isActive = true;
      await doc.save();
      return res.status(200).json({ success: true, data: doc, message: "Partners now see this account." });
    }

    const { error, value } = readAccountBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const oldQr = doc.qrImage;
    Object.assign(doc, value);
    await doc.save();
    if (oldQr !== doc.qrImage) await dropUnusedQr(oldQr);
    return res.status(200).json({ success: true, data: doc, message: "Account updated." });
  }

  if (req.method === "DELETE") {
    const wasShown = doc.isActive;
    const qr = doc.qrImage;
    await doc.deleteOne();
    await dropUnusedQr(qr);

    let message = "Account deleted.";
    if (wasShown) {
      const next = await PaymentAccount.findOne({}).sort({ updatedAt: -1 });
      if (next) {
        next.isActive = true;
        await next.save();
        message = `Account deleted. Partners now see "${next.label || next.bankName}".`;
      } else {
        message = "Account deleted. Partners now see the built-in bank details.";
      }
    }
    return res.status(200).json({ success: true, message });
  }

  res.setHeader("Allow", "PUT, DELETE");
  return res.status(405).json({ message: "Method not allowed" });
}
