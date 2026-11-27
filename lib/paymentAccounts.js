// lib/paymentAccounts.js
// Reading and checking the bank accounts partners pay into for manual top-ups.
import PaymentAccount from "@/models/PaymentAccount";
import { MANUAL_TOPUP_BANK } from "@/config/bankDetails";

export const ACCOUNT_FIELDS = [
  "label",
  "firmName",
  "bankName",
  "accountNumber",
  "accountType",
  "ifsc",
  "branch",
  "branchAddress",
  "upiId",
  "qrImage",
  "whatsappNumber",
];

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^[0-9A-Za-z]{6,34}$/;
const UPI_RE = /^[\w.\-]{2,}@[A-Za-z][\w.\-]*$/;
const PHONE_RE = /^\+?[0-9 ]{8,16}$/;
const QR_RE = /^\/(uploads\/payment-qr|qr)\/[\w\-.]+\.(png|jpe?g|webp)$/i;

// What partners see when no account has been saved from the dashboard yet
export function builtInAccount() {
  return {
    _id: null,
    builtIn: true,
    label: "Built-in details",
    firmName: MANUAL_TOPUP_BANK.firmName,
    bankName: MANUAL_TOPUP_BANK.bankName,
    accountNumber: MANUAL_TOPUP_BANK.accountNumber,
    accountType: MANUAL_TOPUP_BANK.accountType,
    ifsc: MANUAL_TOPUP_BANK.ifsc,
    branch: MANUAL_TOPUP_BANK.branch,
    branchAddress: MANUAL_TOPUP_BANK.branchAddress,
    upiId: MANUAL_TOPUP_BANK.upiId,
    qrImage: MANUAL_TOPUP_BANK.qrImage,
    whatsappNumber: MANUAL_TOPUP_BANK.whatsappNumber,
  };
}

// The account the partner page should show: the one marked as shown, else the built-in one
export async function shownAccount() {
  const doc = await PaymentAccount.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
  if (!doc) return builtInAccount();
  const out = { _id: String(doc._id), builtIn: false };
  for (const f of ACCOUNT_FIELDS) out[f] = doc[f] || "";
  return out;
}

// Validates an admin form. Returns { error } or { value }.
export function readAccountBody(body = {}) {
  const v = {};
  for (const f of ACCOUNT_FIELDS) v[f] = String(body[f] ?? "").trim();
  v.ifsc = v.ifsc.toUpperCase();
  v.accountNumber = v.accountNumber.replace(/\s+/g, "");

  if (!v.firmName) return { error: "Enter the account holder name." };
  if (!v.bankName) return { error: "Enter the bank name." };
  if (!ACCOUNT_RE.test(v.accountNumber)) return { error: "The account number should be 6 to 34 letters or digits." };
  if (!IFSC_RE.test(v.ifsc)) return { error: "The IFSC code should look like UCBA0003572 (11 characters)." };
  if (v.upiId && !UPI_RE.test(v.upiId)) return { error: "The UPI ID should look like name@bank." };
  if (v.whatsappNumber && !PHONE_RE.test(v.whatsappNumber)) return { error: "Enter the WhatsApp number as digits only, e.g. 8619765961." };
  if (v.qrImage && !QR_RE.test(v.qrImage)) return { error: "Upload the QR code picture again." };

  const max = { label: 80, firmName: 120, bankName: 120, accountType: 40, branch: 120, branchAddress: 300, upiId: 80 };
  for (const [f, n] of Object.entries(max)) {
    if (v[f].length > n) return { error: `${f === "branchAddress" ? "Branch address" : "One of the fields"} is too long (max ${n} characters).` };
  }

  return { value: v };
}
