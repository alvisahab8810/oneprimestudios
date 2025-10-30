// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import Cart from "@/models/Cart";

// export default async function handler(req, res) {
//   console.log("🟡 /api/orders/create called with method:", req.method);

//   if (req.method !== "POST") {
//     console.log("🔴 Invalid method");
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   await dbConnect();
//   const user = await getUserFromToken(req);
//   console.log("🟣 User from token:", user?._id || "none");

//   if (!user) {
//     console.log("🔴 Unauthorized user");
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   try {
//     const { address, paymentMethod, totalAmount } = req.body;
//     console.log("🟢 Request body:", req.body);

//     if (!address || !paymentMethod || !totalAmount) {
//       console.log("🔴 Missing required fields");
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Fetch user’s cart
//     const cart = await Cart.findOne({ user: user._id }).populate(
//       "items.product"
//     );
//     if (!cart || cart.items.length === 0) {
//       console.log("🔴 Empty cart");
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     // Generate readable order number
//     const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // e.g. 20251029
//     const randomPart = Math.floor(1000 + Math.random() * 9000); // e.g. 4821
//     const orderNumber = `ORD-${datePart}-${randomPart}`;

//     const order = await Order.create({
//       user: user._id,
//       items: cart.items,
//       address,
//       paymentMethod,
//       total: totalAmount, // ✅ change key name
//       //   totalAmount,
//       status: "Pending",
//       orderNumber, // ✅ Save here
//       createdAt: new Date(),
//     });

//     // clear cart
//     cart.items = [];
//     await cart.save();

//     console.log("✅ Order created:", order._id);
//     // return res.status(201).json({ message: "Order placed successfully", order });
//     return res
//       .status(201)
//       .json({
//         message: "Order placed successfully",
//         orderNumber: order.orderNumber,
//       });
//   } catch (err) {
//     console.error("💥 Order API error:", err);
//     return res.status(500).json({ message: err.message || "Server error" });
//   }
// }






// pages/api/orders/create.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Cart from "@/models/Cart";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { address, paymentMethod, totalAmount } = req.body;
    if (!address || !paymentMethod || !totalAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cart = await Cart.findOne({ user: user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

    // Build items in the format expected by Order schema
    const items = cart.items.map((it) => ({
      product: it.product._id,
      quantity: it.quantity,
      price: it.price,
    }));

    const datePart = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${datePart}-${randomPart}`;

    const order = await Order.create({
      user: user._id,
      items,
      shipping: {
        name: address.name,
        phone: address.phone,
        street: address.street || address.address || "",
        city: address.city,
        state: address.state,
        zip: address.zip || address.pincode || "",
      },
      paymentMethod,
      total: totalAmount,
      status: "Pending",
      orderNumber,
    });

    // clear cart
    cart.items = [];
    await cart.save();

    return res.status(201).json({ message: "Order placed successfully", orderNumber: order.orderNumber, orderId: order._id });
  } catch (err) {
    console.error("Order API error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
