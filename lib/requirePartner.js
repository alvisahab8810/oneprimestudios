// lib/requirePartner.js — the rate list is reached from the B2B portal and is
// closed to retail customers and signed-out visitors. Returns the partner, or
// answers the request itself and returns null.
import getUserFromToken from "@/lib/getUserFromToken";

export default async function requirePartner(req, res) {
  // Per-partner data must never sit in a shared cache
  res.setHeader("Cache-Control", "private, no-store");

  const user = await getUserFromToken(req);
  if (!user) {
    res.status(401).json({ message: "Please sign in to view the rate list" });
    return null;
  }
  if (user.userType !== "partner") {
    res.status(403).json({ message: "The rate list is available to partners only" });
    return null;
  }
  return user;
}
