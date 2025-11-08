


// // pages/api/orders/create.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import Product from "@/models/Product";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     const user = await getUserFromToken(req);
//     if (!user) return res.status(401).json({ message: "Unauthorized" });

//     const { items, subtotal, shippingCharge, total, paymentMethod } = req.body;

//     // ✅ fetch full user data from DB
//     const fullUser = await User.findById(user._id);

//     const order = await Order.create({
//       user: fullUser._id,
//       items: items.map((i) => ({
//         product: i.product,
//         quantity: i.quantity,
//         price: i.price,
//       })),
//       shipping: {
//         name: fullUser.name,
//         phone: fullUser.phone,
//         address: fullUser.businessAddress || "", // ✅ auto-filled
//         companyName: fullUser.companyName || "",
//         gstNumber: fullUser.gstNumber || "",
//       },
//       paymentMethod: paymentMethod || "Cash on Delivery",
//       subtotal,
//       shippingCharge,
//       total,
//       orderNumber: `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
//     });

//     return res.status(201).json({ success: true, order });
//   } catch (error) {
//     console.error("Order creation failed:", error);
//     return res.status(500).json({ message: error.message });
//   }
// }






// pages/api/orders/create.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import User from "@/models/User";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") return res.status(405).end();

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { items, subtotal, shippingCharge, total, paymentMethod } = req.body;

    // ✅ Fetch full user data from DB
    const fullUser = await User.findById(user._id);

    // ✅ Safely structure shipping details
    const order = await Order.create({
      user: fullUser._id,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
      })),

      shipping: {
        name: fullUser.name,
        phone: fullUser.phone,
        street: fullUser.address || fullUser.businessAddress || "",
        city: fullUser.city || "",
        state: fullUser.state || "",
        zip: fullUser.pincode || "",
      },

      paymentMethod: paymentMethod || "Cash on Delivery",
      total,
      orderNumber: `ORD-${new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ message: error.message });
  }
}
