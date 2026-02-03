import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission } from "@/lib/hasPermission";
import Product from "@/models/Product";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = req.cookies.admin_auth;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyJWT(token);
    const admin = await Admin.findById(decoded.id);

    if (!admin) return res.status(401).json({ message: "Unauthorized" });
    if (!hasPermission(admin, "reports.partner_sales")) {
      return res.status(403).json({ message: "No permission" });
    }

    const { partnerId } = req.query;

    const partner = await User.findById(partnerId, {
      name: 1,
      companyName: 1,
      memberId: 1,
    });

    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

const orders = await Order.find({ user: partnerId })
  .sort({ createdAt: -1 })
  .select("orderNumber total status createdAt items paymentMethod")
  .populate("items.product", "name");


    return res.status(200).json({
      partner,
      orders,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
