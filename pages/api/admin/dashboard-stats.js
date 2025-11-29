import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import ContactLead from "@/models/ContactLead";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // 1️⃣ Total Customers
    const totalCustomers = await User.countDocuments({ userType: "customer" });

    // 2️⃣ Total Partners
    const totalPartners = await User.countDocuments({ userType: "partner" });

    // 3️⃣ New signups (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const newSignups = await User.countDocuments({
      createdAt: { $gte: lastWeek },
    });

    // 4️⃣ Total Products
    const totalProducts = await Product.countDocuments();

    // 5️⃣ Pending Orders
    const pendingOrders = await Order.countDocuments({
      status: "Pending",
    });

    // 6️⃣ Total Revenue
    const totalRevenueAgg = await Order.aggregate([
      { $match: { status: { $in: ["Delivered", "Order Delivered"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    //  Contact Leads Count
const contactLeads = await ContactLead.countDocuments();

    // 7️⃣ Total Transactions (successful payments)
    const totalTransactions = await Order.countDocuments({
      status: { $in: ["Delivered", "Order Delivered"] },
    });

    // 8️⃣ Recent Orders
    const recentOrders = await Order.find()
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      totalCustomers,
      totalPartners,
      newSignups,
      totalProducts,
      pendingOrders,
      totalRevenue,
      totalTransactions,
      contactLeads,   // ← new value
      
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
