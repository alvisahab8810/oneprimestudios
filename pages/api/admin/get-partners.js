// pages/api/admin/get-partners.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const partners = await User.find({ userType: "partner" }).sort({
      createdAt: -1,
    });
    res.status(200).json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ message: "Server error" });
  }
}
