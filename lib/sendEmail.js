// lib/sendEmail.js
import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html, cc }) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: "info@viralon.in",
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: `"Viralon Prints" <info@viralon.in>`,
      to,
      cc, // optional
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId, "to:", to, cc ? `cc:${cc}` : "");
    return info;
  } catch (err) {
    console.error("❌ Error in sendEmail:", err);
    throw err;
  }
}
