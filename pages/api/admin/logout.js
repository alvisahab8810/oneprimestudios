import cookie from "cookie";
import { logActivity } from "@/lib/logActivity";

export default async function handler(req, res) {
  // Logged before the cookie is cleared, while the admin is still known
  await logActivity(req, "admin_logout", "Signed out", { entity: "admin" });

  res.setHeader(
    "Set-Cookie",
    cookie.serialize("admin_auth", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    })
  );
  return res.json({ message: "Logged out" });
}
