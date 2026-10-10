// Which side of the business a visitor belongs to: B2B (partners) or B2C (retail).
// One place for the rule, so the category APIs, the product APIs and the
// category pages can never disagree about who sees what.
import jwt from "jsonwebtoken";

export const B2B = "b2b";
export const B2C = "b2c";

// Accepts every spelling in use: the User model stores "partner" / "customer",
// the pages pass "b2b" / "b2c". Anything else is unknown.
export const normalizeAudience = (value) => {
  const v = String(value || "").toLowerCase();
  if (v === "b2b" || v === "partner") return B2B;
  if (v === "b2c" || v === "customer") return B2C;
  return "";
};

// The values of categoryFor / productFor an audience is allowed to see.
// "both" belongs to each side.
export const visibleFor = (audience) =>
  audience === B2B ? [B2B, "both"] : [B2C, "both"];

const readCookie = (req, name) => {
  if (req?.cookies?.[name]) return req.cookies[name];
  const header = req?.headers?.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

// The admin panel reuses the public category and product endpoints to fill its
// pickers, so there it must keep seeing both sides' records.
//
// The admin cookie alone is NOT enough: an admin browsing the storefront in the
// same browser carries that cookie too, and exempting them there leaked B2C
// categories onto the B2B side. The caller has to ask for the admin view with
// ?scope=admin, which only the admin panel's own requests do.
export const isAdminRequest = (req) =>
  req?.query?.scope === "admin" && !!readCookie(req, "admin_auth");

// The signed login token decides. A ?userType= in the URL is only a fallback for
// visitors who are not logged in, so nobody can unlock the other side's catalogue
// by editing the address bar. Unknown or logged-out visitors are treated as B2C.
export function resolveAudience(req, fallback) {
  const token = readCookie(req, "token");
  if (token && process.env.JWT_SECRET) {
    try {
      const fromToken = normalizeAudience(jwt.verify(token, process.env.JWT_SECRET)?.userType);
      if (fromToken) return fromToken;
    } catch {
      // Expired or tampered token — fall through to the anonymous rules
    }
  }
  return normalizeAudience(fallback) || B2C;
}
