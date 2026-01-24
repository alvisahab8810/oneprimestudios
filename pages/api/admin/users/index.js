// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";
// import { verifyJWT } from "@/lib/verifyJWT";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   await dbConnect();

//   try {
//     const token = req.cookies.admin_auth;
//     if (!token) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded || decoded.role !== "admin") {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const users = await Admin.find({}, {
//       name: 1,
//       email: 1,
//       role: 1,
//       isActive: 1,
//       permissions: 1, // 🔥 REQUIRED
//       createdAt: 1,
//     }).sort({ createdAt: -1 });

//     return res.json({ users });
//   } catch (err) {
//     console.error("Fetch users error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// }




import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  await dbConnect();

  const token = req.cookies.admin_auth;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const decoded = verifyJWT(token);
  if (!decoded || decoded.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const {
    search = "",
    role = "",
    page = 1,
    limit = 5,
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    query.role = role;
  }

  const skip = (page - 1) * limit;

  const users = await Admin.find(query, {
    name: 1,
    email: 1,
    role: 1,
    isActive: 1,
    permissions: 1,
  })
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit) + 1);

  const hasMore = users.length > limit;
  if (hasMore) users.pop();

  res.json({ users, hasMore });
}
