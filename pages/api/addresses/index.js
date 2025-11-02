// pages/api/addresses/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import User from "@/models/User"; // assuming user schema contains addresses

export default async function handler(req, res) {
  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method === "GET") {
    const u = await User.findById(user._id).select("addresses").lean();
    return res.json({ addresses: u.addresses || [] });
  }

  if (req.method === "POST") {
    const { name, phone, street, city, state, zip, isDefault } = req.body;
    const u = await User.findById(user._id);
    u.addresses = u.addresses || [];
    const newAddr = { _id: new mongoose.Types.ObjectId(), name, phone, street, city, state, zip, isDefault: !!isDefault };
    if (isDefault) u.addresses.forEach(a=>a.isDefault=false);
    u.addresses.push(newAddr);
    await u.save();
    return res.json({ addresses: u.addresses });
  }

  return res.status(405).end();
}
