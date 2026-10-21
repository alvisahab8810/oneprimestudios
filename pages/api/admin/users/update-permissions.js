import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import { requireSuperAdmin } from "@/lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const me = await requireSuperAdmin(req, res);
    if (!me) return;

    const { userId, permissions } = req.body;
    if (!userId || !Array.isArray(permissions)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await Admin.updateOne(
      { _id: userId },
      { permissions }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Update permission error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
