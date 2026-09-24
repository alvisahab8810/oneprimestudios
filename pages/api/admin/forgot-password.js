// pages/api/admin/forgot-password.js
// Any dashboard user (admin or OPS) can ask for a password reset link by email.
// The link reuses the same invite flow, so the user lands on the Set Password page.
import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import crypto from "crypto";
import { sendEmail } from "@/lib/sendEmail";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  // The same answer is sent whether or not the email exists, so nobody can
  // use this route to find out which email addresses have an account.
  const genericReply = {
    success: true,
    message: "If that email has an account, a reset link has been sent to it.",
  };

  try {
    const email = String(req.body?.email || "").trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Stored emails are not normalised, so the lookup ignores case
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const admin = await Admin.findOne({ email: new RegExp(`^${escaped}$`, "i") });
    // Only invited team users can reset their own password.
    // The main admin account keeps its password as it is, and a deactivated
    // account cannot reset its way back in.
    if (!admin || admin.role === "admin" || admin.isActive === false) {
      return res.status(200).json(genericReply);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    admin.inviteToken = resetToken;
    admin.inviteExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/verify?token=${resetToken}`;

    res.status(200).json(genericReply);

    sendEmail({
      to: admin.email,
      subject: "Reset your One Prime Studios dashboard password",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <p>Hi <b>${admin.name || "there"}</b>,</p>
          <p>We received a request to reset your dashboard password.</p>
          <p>
            <a href="${resetLink}"
               style="display:inline-block;padding:10px 16px;background:#4f6ef7;color:#fff;text-decoration:none;border-radius:6px;">
              Set a new password
            </a>
          </p>
          <p>This link expires in <b>1 hour</b> and can be used once.</p>
          <p>If you did not ask for this, you can ignore this email. Your password stays unchanged.</p>
        </div>
      `,
    }).catch((err) => console.error("Admin reset email failed:", err?.message));
  } catch (err) {
    console.error("Admin forgot password error:", err);
    if (!res.headersSent) return res.status(500).json({ message: "Server error" });
  }
}
