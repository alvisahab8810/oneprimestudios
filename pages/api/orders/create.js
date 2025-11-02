
// // pages/api/orders/create.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import Cart from "@/models/Cart";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

//   await dbConnect();
//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   try {
//     const { address, paymentMethod, totalAmount } = req.body;
//     if (!address || !paymentMethod || !totalAmount) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const cart = await Cart.findOne({ user: user._id }).populate("items.product");
//     if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

//     // Build items in the format expected by Order schema
//     const items = cart.items.map((it) => ({
//       product: it.product._id,
//       quantity: it.quantity,
//       price: it.price,
//     }));

//     const datePart = new Date().toISOString().slice(0,10).replace(/-/g, "");
//     const randomPart = Math.floor(1000 + Math.random() * 9000);
//     const orderNumber = `ORD-${datePart}-${randomPart}`;

//     const order = await Order.create({
//       user: user._id,
//       items,
//       shipping: {
//         name: address.name,
//         phone: address.phone,
//         street: address.street || address.address || "",
//         city: address.city,
//         state: address.state,
//         zip: address.zip || address.pincode || "",
//       },
//       paymentMethod,
//       total: totalAmount,
//       status: "Pending",
//       orderNumber,
//     });

//     // clear cart
//     cart.items = [];
//     await cart.save();

//     return res.status(201).json({ message: "Order placed successfully", orderNumber: order.orderNumber, orderId: order._id });
//   } catch (err) {
//     console.error("Order API error:", err);
//     return res.status(500).json({ message: err.message || "Server error" });
//   }
// }



// pages/api/orders/create.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") return res.status(405).end();

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { items, subtotal, shippingCharge, total, paymentMethod } = req.body;

    // ✅ fetch full user data from DB
    const fullUser = await User.findById(user._id);

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
        address: fullUser.businessAddress || "", // ✅ auto-filled
        companyName: fullUser.companyName || "",
        gstNumber: fullUser.gstNumber || "",
      },
      paymentMethod: paymentMethod || "Cash on Delivery",
      subtotal,
      shippingCharge,
      total,
      orderNumber: `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ message: error.message });
  }
}
