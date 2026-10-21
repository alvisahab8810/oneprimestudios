// Bank account a partner transfers to when they top up their wallet manually.
// These are the company's own receiving details — not secrets — but they are
// kept here (with env overrides) so they can be changed without a code edit.
export const MANUAL_TOPUP_BANK = {
  bankName: process.env.NEXT_PUBLIC_TOPUP_BANK_NAME || "UCO Bank",
  branch: process.env.NEXT_PUBLIC_TOPUP_BANK_BRANCH || "Raebareli Road",
  branchAddress:
    process.env.NEXT_PUBLIC_TOPUP_BANK_BRANCH_ADDRESS ||
    "590/181, Sai Tower, Sai Vihar, Post Office Vrindavan Yojana, Lucknow, UP 226025",
  firmName: process.env.NEXT_PUBLIC_TOPUP_BANK_FIRM || "ONE PRIME STUDIO",
  accountType: process.env.NEXT_PUBLIC_TOPUP_BANK_AC_TYPE || "CAA",
  ifsc: process.env.NEXT_PUBLIC_TOPUP_BANK_IFSC || "UCBA0003572",
  accountNumber: process.env.NEXT_PUBLIC_TOPUP_BANK_AC || "31350210001073",
  upiId: process.env.NEXT_PUBLIC_TOPUP_UPI_ID || "",
  // Scan-and-pay code for the same account, served from public/qr
  qrImage: process.env.NEXT_PUBLIC_TOPUP_QR_IMAGE || "/qr/your-static-qr.jpeg",
  // Shown so a partner who would rather send the screenshot on WhatsApp still can
  whatsappNumber: process.env.NEXT_PUBLIC_TOPUP_WHATSAPP || "8619765961",
};

// The ways a partner can say they sent the money
export const MANUAL_TOPUP_MODES = [
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "Cheque",
  "Cash Deposit",
];

// Guard rails for a single manual request
export const MANUAL_TOPUP_MIN = 1;
export const MANUAL_TOPUP_MAX = 1000000;
