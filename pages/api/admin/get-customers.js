import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { verifyAdmin } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const admin = await verifyAdmin(req, res);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customers = await User.find({ userType: "customer" })
      .select("name email phone createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json(customers);
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}
