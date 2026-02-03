import nodemailer from "nodemailer";

export async function sendInvoiceEmail({
  to,
  subject,
  html,
  pdfPath,
  invoiceNumber,
}) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "admin@oneprimestudios.com",
        pass: process.env.EMAIL_PASS, // App password
      },
    });

    const info = await transporter.sendMail({
      from: `"One Prime Studios" <admin@oneprimestudios.com>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          path: pdfPath,
        },
      ],
    });

    console.log(
      "✅ Invoice email sent:",
      info.messageId,
      "to:",
      to
    );

    return info;
  } catch (error) {
    console.error("❌ Invoice email error:", error);
    throw error;
  }
}
