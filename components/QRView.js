// /components/QRView.js
import { QRCodeCanvas } from "qrcode.react";

export default function QRView({ paymentLink }) {
  if (!paymentLink) return null;

  // Prefer an image if Razorpay returned a QR image link
  const qrImg =
    paymentLink.qr_code ||
    paymentLink.raw?.qr_codes?.standard?.link ||
    paymentLink.raw?.qr_code?.content;

  return (
    <div style={{ textAlign: "center" }}>
      {qrImg ? (
        <img src={qrImg} alt="QR" style={{ width: 220, height: 220 }} />
      ) : (
        <QRCodeCanvas value={paymentLink.short_url} size={220} />
      )}
      <div style={{ marginTop: 8 }}>Scan to pay</div>
    </div>
  );
}
