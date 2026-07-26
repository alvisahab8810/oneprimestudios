// pages/api/admin/users/cities.js
// Returns the distinct list of cities already present among registered
// users/partners — used to power the city-suggestions dropdown on the
// admin product form's City-wise Pricing section.
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const cities = await User.distinct("city", { city: { $nin: [null, ""] } });
    res.status(200).json(cities.sort((a, b) => a.localeCompare(b)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
