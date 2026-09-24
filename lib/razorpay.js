// lib/razorpay.js — one Razorpay client and the payment checks that must run
// on the server. Nothing here trusts anything the browser sent.
import crypto from "crypto";
import Razorpay from "razorpay";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const isRazorpayConfigured = () => Boolean(KEY_ID && KEY_SECRET);

let client = null;
export function getRazorpay() {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay keys are not configured on the server");
  }
  if (!client) client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  return client;
}

// The signature Razorpay Checkout hands back proves the payment belongs to our
// order and was not assembled by the browser. Compared in constant time.
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature || !KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// Fetches the payment from Razorpay so we price the order against what was
// really captured, not against a number posted by the browser.
export async function fetchPayment(paymentId) {
  const payment = await getRazorpay().payments.fetch(paymentId);
  return payment;
}

// Returns "" when the payment can back this order, otherwise the reason why not.
export function checkPaymentMatchesOrder(payment, { orderId, expectedRupees }) {
  if (!payment) return "Payment not found at Razorpay";
  if (payment.order_id !== orderId) return "Payment does not belong to this checkout";
  if (!["captured", "authorized"].includes(payment.status)) {
    return `Payment is not complete (status: ${payment.status})`;
  }
  if (Number(payment.amount) !== toPaise(expectedRupees)) {
    return `Paid amount ₹${(Number(payment.amount) / 100).toFixed(2)} does not match the order total ₹${Number(expectedRupees).toFixed(2)}`;
  }
  return "";
}

// Refunds are asynchronous at Razorpay: this returns as soon as the refund is
// accepted, and the refund webhook confirms or fails it later.
export async function refundPayment({ paymentId, amountRupees, notes = {}, receipt }) {
  const payload = {
    amount: toPaise(amountRupees),
    speed: "normal",
    notes,
  };
  if (receipt) payload.receipt = receipt;
  return getRazorpay().payments.refund(paymentId, payload);
}

// Used when a payment went through but the order could not be created — the
// money must not sit with us. Never throws; the caller is already handling an error.
export async function refundQuietly({ paymentId, amountRupees, reason }) {
  if (!paymentId || !isRazorpayConfigured()) return null;
  try {
    const refund = await refundPayment({
      paymentId,
      amountRupees,
      notes: { reason: reason || "order_not_created" },
    });
    console.error(`Auto-refunded ${paymentId}: ${refund.id} (${reason})`);
    return refund;
  } catch (err) {
    // Nothing more we can do here — this needs a human to refund from the dashboard
    console.error(`AUTO-REFUND FAILED for payment ${paymentId} (${reason}):`, err?.error?.description || err.message);
    return null;
  }
}
