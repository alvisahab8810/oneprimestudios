// pages/api/admin/payment-accounts/index.js
// GET: every saved bank account, plus the built-in details used while none is saved.
// POST: add an account. The first one saved is shown to partners straight away.
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import PaymentAccount from "@/models/PaymentAccount";
import { builtInAccount, readAccountBody } from "@/lib/paymentAccounts";

export default async function handler(req, res) {
  await dbConnect();
  const me = await requireAdminPermission(req, res, "wallet");
  if (!me) return;

  if (req.method === "GET") {
    const list = await PaymentAccount.find({}).sort({ isActive: -1, updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: list, builtIn: builtInAccount() });
  }

  if (req.method === "POST") {
    const { error, value } = readAccountBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const anyShown = await PaymentAccount.exists({ isActive: true });
    const makeShown = !anyShown || req.body?.isActive === true;
    if (makeShown) await PaymentAccount.updateMany({ isActive: true }, { $set: { isActive: false } });

    const doc = await PaymentAccount.create({ ...value, isActive: makeShown });
    return res.status(201).json({
      success: true,
      data: doc,
      message: makeShown ? "Account saved. Partners now see it on the manual payment page." : "Account saved.",
    });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}
