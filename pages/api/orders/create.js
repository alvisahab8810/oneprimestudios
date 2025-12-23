

// // pages/api/orders/create.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import User from "@/models/User";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     const user = await getUserFromToken(req);
//     if (!user) return res.status(401).json({ message: "Unauthorized" });

//     const { items, subtotal, shippingCharge, total, paymentMethod } = req.body;

//     // ✅ Fetch full user data from DB
//     const fullUser = await User.findById(user._id);

//     // 🔹 Collect customer special remarks from cart items
// const customerRemarks = Array.isArray(items)
//   ? items
//       .map((i) => i.remarks)
//       .filter(Boolean)
//       .join(" | ")
//   : "";


//     // ✅ Safely structure shipping details
//     const order = await Order.create({
//       user: fullUser._id,
//       items: items.map((i) => ({
//         product: i.product,
//         quantity: i.quantity,
//         price: i.price,
//       })),

//        // ✅ CUSTOMER SPECIAL REMARKS

//   customerRemarks: customerRemarks,


//       shipping: {
//         name: fullUser.name,
//         phone: fullUser.phone,
//         street: fullUser.address || fullUser.businessAddress || "",
//         city: fullUser.city || "",
//         state: fullUser.state || "",
//         zip: fullUser.pincode || "",
//       },

//       paymentMethod: paymentMethod || "Cash on Delivery",
//       total,
//       orderNumber: `ORD-${new Date()
//         .toISOString()
//         .split("T")[0]
//         .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
//     });

//     return res.status(201).json({ success: true, order });
//   } catch (error) {
//     console.error("Order creation failed:", error);
//     return res.status(500).json({ message: error.message });
//   }
// }







// // pages/api/orders/create.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import Coupon from "@/models/Coupon";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     // 🔐 Auth
//     const user = await getUserFromToken(req);
//     if (!user) return res.status(401).json({ message: "Unauthorized" });

//     const {
//       items,
//       subtotal,
//       shippingCharge,
//       total,
//       paymentMethod,

//       // 🔹 optional coupon fields (NEW)
//       couponCode,
//     } = req.body;

//     // ✅ Fetch full user data from DB
//     const fullUser = await User.findById(user._id);
//     if (!fullUser) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     // 🔹 Collect customer special remarks from cart items (UNCHANGED)
//     const customerRemarks = Array.isArray(items)
//       ? items
//           .map((i) => i.remarks)
//           .filter(Boolean)
//           .join(" | ")
//       : "";

//     // =====================================================
//     // 🎟️ COUPON VALIDATION & CALCULATION (SAFE ADDITION)
//     // =====================================================
//     let couponData = null;
//     // let finalTotal = total; // default → same as before
//       let finalTotal = subtotal; // ✅ always start from subtotal


//     if (couponCode) {
//       const coupon = await Coupon.findOne({
//         code: couponCode.toUpperCase(),
//         isActive: true,
//       });

//       if (!coupon) {
//         return res.status(400).json({ message: "Invalid coupon" });
//       }

//       // expiry check
//       if (coupon.expiryDate && new Date() > coupon.expiryDate) {
//         return res.status(400).json({ message: "Coupon expired" });
//       }

//       // global usage limit
//       if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
//         return res
//           .status(400)
//           .json({ message: "Coupon usage limit reached" });
//       }

//       // user type restriction
//       if (
//         coupon.allowedUserTypes &&
//         !coupon.allowedUserTypes.includes(user.userType)
//       ) {
//         return res
//           .status(403)
//           .json({ message: "Coupon not allowed for this user" });
//       }

   


//       if (userUsageCount >= (coupon.perUserLimit || 1)) {
//         return res
//           .status(400)
//           .json({ message: "Coupon already used" });
//       }

//       // minimum order amount
//       if (subtotal < (coupon.minOrderAmount || 0)) {
//         return res.status(400).json({
//           message: `Minimum order ₹${coupon.minOrderAmount} required`,
//         });
//       }

//       // 🔢 calculate discount (SERVER-SIDE)
//       let discountAmount = 0;

//       if (coupon.discountType === "percentage") {
//         discountAmount = (subtotal * coupon.discountValue) / 100;

//         if (coupon.maxDiscount) {
//           discountAmount = Math.min(
//             discountAmount,
//             coupon.maxDiscount
//           );
//         }
//       } else {
//         // flat coupon
//         discountAmount = coupon.discountValue;
//       }

//       discountAmount = Math.min(discountAmount, subtotal);

//       // 🔒 lock coupon data into order
//       couponData = {
//         code: coupon.code,
//         discountType: coupon.discountType,
//         discountValue: coupon.discountValue,
//         discountAmount,
//       };

//       // finalTotal = total - discountAmount;
//       finalTotal = subtotal - discountAmount;


//       // increment usage
//       coupon.usedCount += 1;
//       await coupon.save();
//     }

//     // =====================================================
//     // 🧾 ORDER CREATION (UNCHANGED + SAFE ADDITIONS)
//     // =====================================================
//    const order = await Order.create({
//   user: fullUser._id,

//   items: items.map((i) => ({
//     product: i.product,
//     quantity: i.quantity,
//     price: i.price,
//   })),

//   subtotal: subtotal, // ✅ REQUIRED FIELD (FIX)

//   customerRemarks,

//   shipping: {
//     name: fullUser.name,
//     phone: fullUser.phone,
//     street: fullUser.address || fullUser.businessAddress || "",
//     city: fullUser.city || "",
//     state: fullUser.state || "",
//     zip: fullUser.pincode || "",
//   },

//   paymentMethod: paymentMethod || "Cash on Delivery",

//   total: finalTotal,

//   coupon: couponData,

//   orderNumber: `ORD-${new Date()
//     .toISOString()
//     .split("T")[0]
//     .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
// });

//     return res.status(201).json({
//       success: true,
//       order,
//     });
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
import Coupon from "@/models/Coupon";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔐 AUTH
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 📦 REQUEST DATA
    const {
      items,
      subtotal,
      paymentMethod,
      couponCode, // ✅ MUST COME FROM CHECKOUT
    } = req.body;

    // 🛑 BASIC VALIDATION
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (typeof subtotal !== "number" || subtotal <= 0) {
      return res.status(400).json({ message: "Invalid subtotal" });
    }

    // 👤 FULL USER DATA
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
      return res.status(400).json({ message: "User not found" });
    }

    // 📝 CUSTOMER REMARKS (FROM CART ITEMS)
    const customerRemarks = items
      .map((i) => i.remarks)
      .filter(Boolean)
      .join(" | ");

    // =====================================================
    // 🎟️ COUPON LOGIC
    // =====================================================
    let couponData = null;
    let finalTotal = subtotal;

    if (couponCode) {
      console.log("➡️ Incoming couponCode:", couponCode);

      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      });

      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon" });
      }

      // ⏳ EXPIRY CHECK
      if (coupon.expiryDate && new Date() > coupon.expiryDate) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      // 🌍 GLOBAL USAGE LIMIT
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res
          .status(400)
          .json({ message: "Coupon usage limit reached" });
      }

      // 👥 USER TYPE CHECK
      if (
        coupon.allowedUserTypes &&
        !coupon.allowedUserTypes.includes(user.userType)
      ) {
        return res
          .status(403)
          .json({ message: "Coupon not allowed for this user" });
      }

      // 👤 PER-USER USAGE CHECK
      const userUsageCount = await Order.countDocuments({
        user: user._id,
        "coupon.code": coupon.code,
      });

      if (userUsageCount >= (coupon.perUserLimit || 1)) {
        return res
          .status(400)
          .json({ message: "Coupon already used by you" });
      }

      // 💰 MIN ORDER CHECK
      if (subtotal < (coupon.minOrderAmount || 0)) {
        return res.status(400).json({
          message: `Minimum order ₹${coupon.minOrderAmount} required`,
        });
      }

      // 🧮 DISCOUNT CALCULATION
      let discountAmount = 0;

      if (coupon.discountType === "percentage") {
        discountAmount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      discountAmount = Math.min(discountAmount, subtotal);

      couponData = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      };

      finalTotal = subtotal - discountAmount;

      // 📈 INCREMENT COUPON USAGE
      coupon.usedCount += 1;
      await coupon.save();
    }

    // =====================================================
    // 🧾 CREATE ORDER
    // =====================================================
    const order = await Order.create({
      user: fullUser._id,

      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
      })),

      subtotal, // ✅ ORIGINAL AMOUNT
      total: finalTotal, // ✅ FINAL PAYABLE

      coupon: couponData, // ✅ STORED SNAPSHOT

      customerRemarks,

      shipping: {
        name: fullUser.name,
        phone: fullUser.phone,
        street: fullUser.address || fullUser.businessAddress || "",
        city: fullUser.city || "",
        state: fullUser.state || "",
        zip: fullUser.pincode || "",
      },

      paymentMethod: paymentMethod || "Cash on Delivery",

      orderNumber: `ORD-${new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
    });

    // ✅ SUCCESS
    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ Order creation failed:", error);
    return res.status(500).json({ message: error.message });
  }
}
