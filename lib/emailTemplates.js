// lib/emailTemplates.js
export function orderStatusTemplate({ name, orderNumber, status, remarks, items, total }) {
  const statusMessages = {
    Pending: "We've received your order and it is awaiting processing.",
    Processing: "Your order is being processed by our team.",
    "In Progress": "Work on your order has started.",
    "Design Approved": "Your design has been approved.",
    "Design Rejected": "Your design was rejected — see remarks.",
    Printing: "Your order is in printing.",
    Shipped: "Your order has been shipped. Tracking details will follow.",
    Delivered: "Your order has been delivered.",
    Cancelled: "Your order has been cancelled.",
    Rejected: "Your order was rejected. Contact support for details.",
  };

  const message = statusMessages[status] || "Your order status has been updated.";

  // simple items list (you can expand with product names/images by populating items.product)
  const itemsHtml = (items || []).map(it => {
    const prod = it.product && it.product.name ? it.product.name : `Product ID: ${it.product}`;
    return `<li>${prod} — Qty: ${it.quantity} — ₹${it.price}</li>`;
  }).join("");

  return `
  <div style="font-family:Arial,sans-serif; max-width:680px; margin:auto; border:1px solid #eee; border-radius:8px; overflow:hidden;">
    <div style="background:#1a73e8; color:#fff; padding:16px 20px; text-align:center;">
      <h1 style="margin:0; font-size:20px;">OnePrimeStudios </h1>
      <div style="font-size:14px; opacity:0.95;">Order update — #${orderNumber}</div>
    </div>

    <div style="padding:20px; color:#333;">
      <p>Hi <strong>${name}</strong>,</p>
      <p>${message}</p>

      <p><strong>Current status:</strong> <span style="background:#f1f7ff;color:#0b57d0;padding:6px 10px;border-radius:6px;">${status}</span></p>

      ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ""}

      <hr style="margin:18px 0; border:none; border-top:1px solid #eee;" />
      <h3 style="margin:0 0 8px 0;">Order details</h3>
      <ul style="padding-left:18px; margin-top:6px;">${itemsHtml}</ul>
      <p style="margin-top:8px;"><strong>Total:</strong> ₹${total}</p>

      <p style="margin-top:18px;">You can view your order in your account or contact us for any questions.</p>

      <p style="margin-top:18px; font-size:13px; color:#666;">
        Thank you,<br/>OnePrimeStudios  Support Team
      </p>
    </div>

    <div style="background:#fafafa; padding:12px; text-align:center; color:#777; font-size:13px;">
      Need help? Reply to this email or contact: <a href="mailto:Contact@oneprimestudios.in">Contact@oneprimestudios.in</a>
    </div>
  </div>
  `;
}
