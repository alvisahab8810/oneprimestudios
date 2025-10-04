// pages/api/auth/forgot-password.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Generate reset token (valid for 1 hour)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}&id=${user._id}`;

    // ✅ Setup Hostinger SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: "info@viralon.in", // ✅ Your Hostinger email
        pass: process.env.EMAIL_PASS, // ✅ Password from Hostinger
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ Send the email
    await transporter.sendMail({
      from: `"ViralOn Support" <info@viralon.in>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.name},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    return res.status(200).json({ message: "Password reset link sent to email!" });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
