// pages/api/admin/users/[id]/invite.js
// Super admin re-sends access to one OPS staff account:
//   mode "invite" — a fresh 24h invite for someone who never set a password
//   mode "reset"  — a 1h password reset link for an account already in use
// Both mint a new token, so any older link stops working straight away.
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import crypto from "crypto";
import Admin from "@/models/Admin";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { sendEmail } from "@/lib/sendEmail";
import { logActivity } from "@/lib/logActivity";

const HOUR = 60 * 60 * 1000;

function inviteEmail({ name, role, link, hours }) {
  return `
    <div style="font-family: Arial, sans-serif;">
      <p>Hi <b>${name}</b>,</p>
      <p>You have been invited to join <b>One Prime Studios</b> as a <b>${String(role).replace("_", " ")}</b>.</p>
      <p>Please click the button below to set your password:</p>
      <p>
        <a href="${link}" style="display:inline-block;padding:10px 16px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:4px;">
          Set Password
        </a>
      </p>
      <p>This link is valid for <b>${hours} hours</b> and can be used once.</p>
      <p>If you did not expect this email, you can safely ignore it.</p>
      <br/>
      <p>— One Prime Studios Team</p>
    </div>
  `;
}

function resetEmail({ name, link }) {
  return `
    <div style="font-family: Arial, sans-serif;">
      <p>Hi <b>${name}</b>,</p>
      <p>Your dashboard password was reset by an administrator.</p>
      <p>
        <a href="${link}" style="display:inline-block;padding:10px 16px;background:#4f6ef7;color:#fff;text-decoration:none;border-radius:6px;">
          Set a new password
        </a>
      </p>
      <p>This link expires in <b>1 hour</b> and can be used once.</p>
      <p>If you did not expect this, please contact your administrator.</p>
      <br/>
      <p>— One Prime Studios Team</p>
    </div>
  `;
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const me = await requireSuperAdmin(req, res);
  if (!me) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    const user = await Admin.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const mode = req.body?.mode === "reset" ? "reset" : "invite";
    const hours = mode === "reset" ? 1 : 24;

    const token = crypto.randomBytes(32).toString("hex");
    user.inviteToken = token;
    user.inviteExpires = new Date(Date.now() + hours * HOUR);

    // A reset hands the account back to the invite flow, so the old password
    // must stop working until a new one is set.
    if (mode === "reset") {
      user.password = "INVITED_USER";
      user.isActive = false;
    }

    await user.save();

    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const link = `${base}/invite/verify?token=${token}`;

    let emailSent = true;
    try {
      await sendEmail({
        to: user.email,
        subject:
          mode === "reset"
            ? "Reset your One Prime Studios dashboard password"
            : "You are invited to One Prime Studios Admin Panel",
        html:
          mode === "reset"
            ? resetEmail({ name: user.name || "there", link })
            : inviteEmail({ name: user.name || "there", role: user.role, link, hours }),
      });
    } catch (mailErr) {
      // The link is still valid, so the super admin can pass it on by hand
      emailSent = false;
      console.error("Invite email send error:", mailErr?.message);
    }

    logActivity(
      req,
      mode === "reset" ? "ops_user_password_reset" : "ops_user_reinvited",
      mode === "reset"
        ? `Password reset link sent to "${user.name}" (${user.email})`
        : `Invite re-sent to "${user.name}" (${user.email})`,
      { entity: "admin", entityId: user._id, meta: { email: user.email, mode, emailSent } },
    );

    return res.json({
      success: true,
      mode,
      emailSent,
      // Shown to the super admin so access can be shared even if mail fails
      link,
      expiresAt: user.inviteExpires,
      message: emailSent
        ? mode === "reset"
          ? "Password reset link sent"
          : "Invite sent"
        : "Email could not be sent — copy the link and share it",
    });
  } catch (err) {
    console.error("Resend invite error:", err);
    return res.status(500).json({ message: "Could not send the link" });
  }
}
