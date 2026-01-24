// import dbConnect from "@/lib/dbConnect";
// import User from "@/models/User";
// import { verifyAdmin } from "@/lib/verifyJWT";

// export default async function handler(req, res) {
//   try {
//     await dbConnect();

//     const admin = await verifyAdmin(req, res);
//     if (!admin) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const customers = await User.find({ userType: "customer" })
//       .select("name email phone createdAt")
//       .sort({ createdAt: -1 });

//     return res.status(200).json(customers);
//   } catch (error) {
//     console.error("❌ Error fetching customers:", error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// }




import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 1. Verify login
    const token = req.cookies.admin_auth;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔥 2. Load admin/OPS user from DB (permissions source)
    const adminUser = await Admin.findById(decoded.id, {
      role: 1,
      permissions: 1,
    });

    if (!adminUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 👤 3. Build permission-check user
    const user = {
      id: adminUser._id,
      role: adminUser.role,
      permissions: adminUser.permissions || [],
    };

    // 🔒 4. Permission check
    if (!hasPermission(user, "customers")) {
      return res.status(403).json({ message: "No permission" });
    }

    // 📦 5. Business logic (UNCHANGED)
    const customers = await User.find({ userType: "customer" })
      .select("name email phone createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json(customers);

  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}
