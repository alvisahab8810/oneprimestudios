// lib/sendEmail.js — the one place email leaves the app from.
//
// Gmail's SMTP is the slow, flaky part of a request: a handshake can hang for
// a minute on a cold server, and a single blip used to surface to the customer
// as "Internal server error". So the transporter is reused, every stage has a
// short timeout, and one retry covers a transient failure. A permanent problem
// (wrong app password, mailbox refused) is never retried — it is reported.
import nodemailer from "nodemailer";

// Gmail accepts a handful of connections at a time, so one pooled transporter
// is reused across requests instead of opening a fresh one every time
let transporter = null;

const FROM = `"One Prime Studios" <admin@oneprimestudios.com>`;
const SENDER = "admin@oneprimestudios.com";

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_PASS) {
    throw new Error("EMAIL_PASS is not set, so no email can be sent");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 3,
    auth: {
      user: SENDER,
      pass: process.env.EMAIL_PASS,
    },
    // Fail fast instead of holding the request open until the page times out
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
};

// A 4xx SMTP reply or a dropped connection is worth one more try; a 5xx reply
// means the message will never be accepted, so retrying only wastes the request
const isWorthRetrying = (err) => {
  const code = Number(err?.responseCode);
  if (code >= 500 && code < 600) return false;
  return true;
};

export async function sendEmail({ to, subject, html, cc }) {
  const message = { from: FROM, to, cc, subject, html };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await getTransporter().sendMail(message);
      console.log("Email sent:", info.messageId, "to:", to, cc ? `cc:${cc}` : "");
      return info;
    } catch (err) {
      console.error(
        `Email attempt ${attempt} failed for ${to}:`,
        err?.responseCode || err?.code || "",
        err?.message
      );

      // A broken pooled connection must not be handed to the next request
      if (transporter) {
        transporter.close();
        transporter = null;
      }

      if (attempt === 2 || !isWorthRetrying(err)) throw err;
    }
  }
}
