// /lib/verifyJWT.js
import jwt from "jsonwebtoken";

/**
 * Verify a raw JWT token (used internally)
 */
export function verifyJWT(token) {
  try {
    const base64UrlDecode = (input) => {
      input = input.replace(/-/g, "+").replace(/_/g, "/");
      const pad = input.length % 4;
      if (pad) input += "=".repeat(4 - pad);
      return Buffer.from(input, "base64").toString("utf8");
    };

    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const exp = payload.exp * 1000;
    if (Date.now() > exp) return null;

    return payload; // ✅ valid token payload
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return null;
  }
}

/**
 * Verify admin from cookie or header
 */
export async function verifyAdmin(req, res) {
  try {
    // Check cookie first
    const cookieToken = req.cookies?.admin_auth;
    const headerToken = req.headers.authorization?.split(" ")[1];
    const token = cookieToken || headerToken;

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== "admin") {
      return null;
    }

    return decoded; // ✅ valid admin payload
  } catch (error) {
    console.error("verifyAdmin failed:", error);
    return null;
  }
}
