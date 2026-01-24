import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const token = req.cookies.admin_auth;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const decoded = verifyJWT(token);
  if (!decoded || decoded.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { id } = req.query;

  await Admin.findByIdAndDelete(id);
  return res.json({ success: true });
}
