// Bank account a partner transfers to when they top up their wallet manually.
// These are the company's own receiving details — not secrets — but they are
// kept here (with env overrides) so they can be changed without a code edit.
export const MANUAL_TOPUP_BANK = {
  bankName: process.env.NEXT_PUBLIC_TOPUP_BANK_NAME || "IDFC First Bank",
  branch: process.env.NEXT_PUBLIC_TOPUP_BANK_BRANCH || "C-Scheme, Jaipur, Rajasthan",
  firmName:
    process.env.NEXT_PUBLIC_TOPUP_BANK_FIRM || "PRINTERS CLUB OF INDIA LIMITED",
  ifsc: process.env.NEXT_PUBLIC_TOPUP_BANK_IFSC || "IDFB0042127",
  accountNumber: process.env.NEXT_PUBLIC_TOPUP_BANK_AC || "10062876334",
  upiId: process.env.NEXT_PUBLIC_TOPUP_UPI_ID || "",
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
