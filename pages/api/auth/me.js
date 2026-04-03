import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";

// Lightweight endpoint polled by frontend to detect session revocation.
// Returns 200 + { ok: true } while the user is valid and approved.
// Returns 401 the moment a partner is revoked (getUserFromToken returns null for revoked partners).
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({ ok: true, userType: user.userType });
}
