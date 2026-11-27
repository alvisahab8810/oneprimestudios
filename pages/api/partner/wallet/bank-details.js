// pages/api/partner/wallet/bank-details.js
// The bank account and QR code shown on the partner "Manual Payment" page.
// These are the company's own receiving details, so no login is needed.
import dbConnect from "@/lib/dbConnect";
import { shownAccount } from "@/lib/paymentAccounts";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const account = await shownAccount();
  const { label, ...publicFields } = account;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ success: true, data: publicFields });
}
