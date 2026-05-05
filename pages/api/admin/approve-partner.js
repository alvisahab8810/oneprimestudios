



// import dbConnect from "@/lib/dbConnect";
// import User from "@/models/User";
// import nodemailer from "nodemailer";

// export default async function handler(req, res) {
//   if (req.method !== "PUT") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   await dbConnect();

//   const { userId, isApproved } = req.body;

//   try {
//     const user = await User.findByIdAndUpdate(
//       userId,
//       { isApproved },
//       { new: true }
//     );

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // ✅ Respond immediately to frontend
//     res.status(200).json({
//       message: isApproved
//         ? "Partner approved successfully ✅"
//         : "Partner approval revoked 🚫",
//       user,
//     });

//     // ✅ Send email asynchronously (keeps original body text)
//     sendApprovalEmail(user).catch((err) =>
//       console.error("Email sending error:", err)
//     );
//   } catch (error) {
//     console.error("Approval update error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// }

// // ✅ Async email sender (keeps your original professional email HTML)
// async function sendApprovalEmail(user) {
//   const transporter = nodemailer.createTransport({
//     host: "smtp.hostinger.com",
//     port: 587,
//     secure: false,
//     auth: {
//       user: "info@viralon.in",
//       pass: process.env.EMAIL_PASS,
//     },
//     tls: {
//       rejectUnauthorized: false,
//     },
//   });

//   let subject, emailHtml;

//   if (user.isApproved) {
//     subject = "🎉 Your Partner Account Has Been Approved!";
//     emailHtml = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
//         <div style="background-color: #1a73e8; color: #fff; padding: 20px; text-align: center;">
//           <h1 style="margin:0; font-size: 24px;">OnePrimeStudios Partner Program</h1>
//         </div>
//         <div style="padding: 30px; color: #333;">
//           <h2 style="color: #1a73e8;">Congratulations, ${user.name}!</h2>
//           <p>We are thrilled to inform you that your partner account has been <strong>approved</strong> by our team.</p>
//           <p>You can now <a href="http://localhost:3000/login" target="_blank" style="color: #1a73e8; font-weight: bold;">log in</a> and access all partner features.</p>
//           <p>If you have any questions or need support, feel free to reach out to us anytime.</p>
//           <div style="text-align: center; margin: 30px 0;">
//             <a href="http://localhost:3000/login" target="_blank" style="background-color: #1a73e8; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a>
//           </div>
//         </div>
//         <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #555;">
//           <p>OnePrimeStudios Support Team</p>
//           <p><a href="mailto:Contact@oneprimestudios.in" style="color: #1a73e8;">Contact@oneprimestudios.in</a></p>
//         </div>
//       </div>
//     `;
//   } else {
//     subject = "⚠️ Partner Account Approval Update";
//     emailHtml = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
//         <div style="background-color: #e84141; color: #fff; padding: 20px; text-align: center;">
//           <h1 style="margin:0; font-size: 24px;">OnePrimeStudios Partner Program</h1>
//         </div>
//         <div style="padding: 30px; color: #333;">
//           <h2 style="color: #e84141;">Hello, ${user.name}</h2>
//           <p>We wanted to inform you that your partner account approval has been <strong>revoked or rejected</strong> by our team.</p>
//           <p>If you believe this is a mistake or need assistance, please contact our support team.</p>
//           <div style="text-align: center; margin: 30px 0;">
//             <a href="mailto:Contact@oneprimestudios.in" style="background-color: #e84141; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Support</a>
//           </div>
//         </div>
//         <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #555;">
//           <p>OnePrimeStudios Support Team</p>
//           <p><a href="mailto:Contact@oneprimestudios.in" style="color: #e84141;">Contact@oneprimestudios.in</a></p>
//         </div>
//       </div>
//     `;
//   }

//   await transporter.sendMail({
//     from: `"ViralOn Support" <info@viralon.in>`,
//     to: user.email,
//     subject,
//     html: emailHtml,
//   });
// }









import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";
import { logActivity } from "@/lib/logActivity";
// import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const { userId, isApproved } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isApproved },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Respond immediately to frontend
    res.status(200).json({
      message: isApproved
        ? "Partner approved successfully ✅"
        : "Partner approval revoked 🚫",
      user,
    });

    // Fire-and-forget activity log
    logActivity(req,
      isApproved ? "partner_approved" : "partner_revoked",
      isApproved
        ? `Partner "${user.name}" (${user.email}) approved`
        : `Partner "${user.name}" (${user.email}) approval revoked`,
      { entity: "user", entityId: String(user._id), meta: { userName: user.name, userEmail: user.email } }
    );

    // ✅ Send email asynchronously (keeps original body text)
    sendApprovalEmail(user).catch((err) =>
      console.error("Email sending error:", err)
    );
  } catch (error) {
    console.error("Approval update error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ✅ Async email sender (keeps your original professional email HTML)
async function sendApprovalEmail(user) {
  let subject, emailHtml;

  if (user.isApproved) {
    subject = "🎉 Your Partner Account Has Been Approved!";
    emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1a73e8; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin:0; font-size: 24px;">OnePrimeStudios Partner Program</h1>
        </div>
        <div style="padding: 30px; color: #333;">
          <h2 style="color: #1a73e8;">Congratulations, ${user.name}!</h2>
          <p>Your partner account has been <strong>approved</strong>.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login"
              style="background:#1a73e8;color:#fff;padding:12px 25px;
              text-decoration:none;border-radius:5px;font-weight:bold;">
              Log In Now
            </a>
          </div>
        </div>
        <div style="background:#f5f5f5;padding:20px;text-align:center;">
          <p>OnePrimeStudios Support Team</p>
          <p>admin@oneprimestudios.com</p>
        </div>
      </div>
    `;
  } else {
    subject = "⚠️ Partner Account Approval Update";
    emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #e84141; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin:0; font-size: 24px;">OnePrimeStudios Partner Program</h1>
        </div>
        <div style="padding: 30px; color: #333;">
          <h2>Hello, ${user.name}</h2>
          <p>Your partner account approval has been revoked.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="mailto:admin@oneprimestudios.com"
              style="background:#e84141;color:#fff;padding:12px 25px;
              text-decoration:none;border-radius:5px;font-weight:bold;">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    `;
  }

  await sendEmail({
    to: user.email,
    subject,
    html: emailHtml,
  });
}

