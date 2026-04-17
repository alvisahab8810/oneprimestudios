import nodemailer from "nodemailer";

export async function sendInvoiceEmail({
  to,
  subject,
  html,
  attachments = [],
}) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "admin@oneprimestudios.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"One Prime Studios" <admin@oneprimestudios.com>`,
    to,
    subject,
    html,
    attachments,
  });

  console.log("✅ Invoice email sent:", info.messageId, "to:", to);
  return info;
}
