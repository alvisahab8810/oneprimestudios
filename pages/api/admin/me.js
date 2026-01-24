import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  const token = req.cookies.admin_auth;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await Admin.findById(decoded.id, {
    role: 1,
    permissions: 1,
    name: 1,
    email: 1,
  });

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({
    role: user.role,
    permissions: user.permissions || [],
    name: user.name,
    email: user.email,
  });
}
