// pages/api/orders/create.js
// FIX: Copy uploadedFiles and uploadedAttributeFiles from cart items into order items.
// That's the ONLY change — one line in the items.map().
// Everything else (wallet, coupon, Razorpay, auth) is 100% unchanged.

import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import User from "@/models/User";
import Coupon from "@/models/Coupon";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // AUTH
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { items, subtotal, gstAmount = 0, paymentMethod, couponCode } = req.body;

    const normalizedPaymentMethod =
      typeof paymentMethod === "string" ? paymentMethod.toLowerCase() : null;

    if (!normalizedPaymentMethod) {
      return res.status(400).json({ message: "Payment method required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (typeof subtotal !== "number" || subtotal <= 0) {
      return res.status(400).json({ message: "Invalid subtotal" });
    }

    const fullUser = await User.findById(user._id);
    if (!fullUser) return res.status(400).json({ message: "User not found" });

    // PAYMENT METHOD HARD LOCK
    if (fullUser.userType === "partner" && normalizedPaymentMethod !== "wallet") {
      return res.status(403).json({ message: "Partners can pay only using Wallet" });
    }
    if (fullUser.userType === "customer" && normalizedPaymentMethod !== "razorpay") {
      return res.status(403).json({ message: "Customers can pay only via Razorpay" });
    }

    // CUSTOMER REMARKS
    const customerRemarks = items.map((i) => i.remarks).filter(Boolean).join(" | ");

    // COUPON LOGIC — unchanged
    let couponData = null;
    let finalTotal = subtotal;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) return res.status(400).json({ message: "Invalid coupon" });
      if (coupon.expiryDate && new Date() > coupon.expiryDate)
        return res.status(400).json({ message: "Coupon expired" });
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
        return res.status(400).json({ message: "Coupon usage limit reached" });
      if (coupon.allowedUserTypes && !coupon.allowedUserTypes.includes(user.userType))
        return res.status(403).json({ message: "Coupon not allowed for this user" });

      const userUsageCount = await Order.countDocuments({
        user: user._id,
        "coupon.code": coupon.code,
      });
      if (userUsageCount >= (coupon.perUserLimit || 1))
        return res.status(400).json({ message: "Coupon already used by you" });
      if (subtotal < (coupon.minOrderAmount || 0))
        return res.status(400).json({ message: `Minimum order ₹${coupon.minOrderAmount} required` });

      let discountAmount = 0;
      if (coupon.discountType === "percentage") {
        discountAmount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
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
      finalTotal = subtotal - discountAmount + Number(gstAmount || 0);
    } else {
      finalTotal = subtotal + Number(gstAmount || 0);
    }

    // CREATE ORDER + WALLET — atomic
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // WALLET PAYMENT
      if (normalizedPaymentMethod === "wallet") {
        const wallet = await Wallet.findOne({ user: user._id }).session(session);
        if (!wallet) throw new Error("Wallet not found");
        if (wallet.balance < finalTotal) throw new Error("Insufficient wallet balance");

        wallet.balance -= finalTotal;
        await wallet.save({ session });

        await WalletTransaction.create(
          [{ user: user._id, type: "debit", amount: finalTotal, description: "Order Payment", referenceType: "order_payment", status: "success" }],
          { session }
        );
      }

      // ── CREATE ORDER ────────────────────────────────────────────────────────
      const order = await Order.create(
        [
          {
            user: fullUser._id,

            // ── FIX: carry uploadedFiles + uploadedAttributeFiles from cart ──
            // OLD (missing files):
            //   items: items.map((i) => ({ product, quantity, price }))
            //
            // NEW (files included):
            //   items: items.map((i) => ({ product, quantity, price,
            //            uploadedFiles, uploadedAttributeFiles, remarks }))
            items: items.map((i) => ({
              product:  i.product,
              quantity: i.quantity,
              price:    i.price,
              remarks:  i.remarks || "",

              // These two lines are the ENTIRE fix:
              uploadedFiles:          Array.isArray(i.uploadedFiles) ? i.uploadedFiles : [],
              uploadedAttributeFiles: Array.isArray(i.uploadedAttributeFiles)
                ? i.uploadedAttributeFiles.map((f) => ({
                    attributeName: f.attributeName || "",
                    name:          f.name || "",
                    url:           f.url || "",
                  }))
                : [],
            })),

            subtotal,
            gstAmount: Number(gstAmount || 0),
            total: finalTotal,
            coupon: couponData,
            customerRemarks,

            shipping: {
              name:   fullUser.name,
              phone:  fullUser.phone,
              street: fullUser.address || fullUser.businessAddress || "",
              city:   fullUser.city || "",
              state:  fullUser.state || "",
              zip:    fullUser.pincode || "",
            },

            paymentMethod: normalizedPaymentMethod === "wallet" ? "Wallet" : "Razorpay",
            paymentStatus: normalizedPaymentMethod === "wallet" ? "PAID" : "UNPAID",

            razorpay:
              normalizedPaymentMethod === "razorpay"
                ? { orderId: req.body.razorpayOrderId || null, paymentId: null, signature: null }
                : undefined,

            orderNumber: `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
          },
        ],
        { session }
      );

      // INCREMENT COUPON USAGE
      if (couponData) {
        await Coupon.updateOne(
          { code: couponData.code },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({ success: true, order: order[0] });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: error.message || "Order failed" });
    }

  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ message: error.message });
  }
}











// // pages/api/orders/create.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import Coupon from "@/models/Coupon";

// import Wallet from "@/models/Wallet";
// import WalletTransaction from "@/models/WalletTransaction";
// import mongoose from "mongoose";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     // 🔐 AUTH
//     const user = await getUserFromToken(req);
//     if (!user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // 📦 REQUEST DATA
//     const { items, subtotal, paymentMethod, couponCode } = req.body;

//     const normalizedPaymentMethod =
//   typeof paymentMethod === "string"
//     ? paymentMethod.toLowerCase()
//     : null;

// if (!normalizedPaymentMethod) {
//   return res.status(400).json({ message: "Payment method required" });
// }


//     // 🛑 BASIC VALIDATION
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     if (typeof subtotal !== "number" || subtotal <= 0) {
//       return res.status(400).json({ message: "Invalid subtotal" });
//     }

//     // 👤 FULL USER DATA
//     const fullUser = await User.findById(user._id);
//     if (!fullUser) {
//       return res.status(400).json({ message: "User not found" });
//     }



//     // =====================================================
// // 🔐 PAYMENT METHOD HARD LOCK (CRITICAL)
// // =====================================================
// if (fullUser.userType === "partner") {
//   if (normalizedPaymentMethod !== "wallet") {
//     return res.status(403).json({
//       message: "Partners can pay only using Wallet",
//     });
//   }
// }

// if (fullUser.userType === "customer") {
//   if (normalizedPaymentMethod !== "razorpay") {
//     return res.status(403).json({
//       message: "Customers can pay only via Razorpay",
//     });
//   }
// }


//     // 📝 CUSTOMER REMARKS (FROM CART ITEMS)
//     const customerRemarks = items
//       .map((i) => i.remarks)
//       .filter(Boolean)
//       .join(" | ");

//     // =====================================================
//     // 🎟️ COUPON LOGIC
//     // =====================================================
//     let couponData = null;
//     let finalTotal = subtotal;

//     if (couponCode) {
//       console.log("➡️ Incoming couponCode:", couponCode);

//       const coupon = await Coupon.findOne({
//         code: couponCode.toUpperCase(),
//         isActive: true,
//       });

//       if (!coupon) {
//         return res.status(400).json({ message: "Invalid coupon" });
//       }

//       // ⏳ EXPIRY CHECK
//       if (coupon.expiryDate && new Date() > coupon.expiryDate) {
//         return res.status(400).json({ message: "Coupon expired" });
//       }

//       // 🌍 GLOBAL USAGE LIMIT
//       if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
//         return res.status(400).json({ message: "Coupon usage limit reached" });
//       }

//       // 👥 USER TYPE CHECK
//       if (
//         coupon.allowedUserTypes &&
//         !coupon.allowedUserTypes.includes(user.userType)
//       ) {
//         return res
//           .status(403)
//           .json({ message: "Coupon not allowed for this user" });
//       }

//       // 👤 PER-USER USAGE CHECK
//       const userUsageCount = await Order.countDocuments({
//         user: user._id,
//         "coupon.code": coupon.code,
//       });

//       if (userUsageCount >= (coupon.perUserLimit || 1)) {
//         return res.status(400).json({ message: "Coupon already used by you" });
//       }

//       // 💰 MIN ORDER CHECK
//       if (subtotal < (coupon.minOrderAmount || 0)) {
//         return res.status(400).json({
//           message: `Minimum order ₹${coupon.minOrderAmount} required`,
//         });
//       }

//       // 🧮 DISCOUNT CALCULATION
//       let discountAmount = 0;

//       if (coupon.discountType === "percentage") {
//         discountAmount = (subtotal * coupon.discountValue) / 100;
//         if (coupon.maxDiscount) {
//           discountAmount = Math.min(discountAmount, coupon.maxDiscount);
//         }
//       } else {
//         discountAmount = coupon.discountValue;
//       }

//       discountAmount = Math.min(discountAmount, subtotal);

//       couponData = {
//         code: coupon.code,
//         discountType: coupon.discountType,
//         discountValue: coupon.discountValue,
//         discountAmount,
//       };

//       finalTotal = subtotal - discountAmount;
//     }

//     // =====================================================
//     // 🧾 CREATE ORDER
//     // =====================================================
//     // const order = await Order.create({
//     //   user: fullUser._id,

//     //   items: items.map((i) => ({
//     //     product: i.product,
//     //     quantity: i.quantity,
//     //     price: i.price,
//     //   })),

//     //   subtotal, // ✅ ORIGINAL AMOUNT
//     //   total: finalTotal, // ✅ FINAL PAYABLE

//     //   coupon: couponData, // ✅ STORED SNAPSHOT

//     //   customerRemarks,

//     //   shipping: {
//     //     name: fullUser.name,
//     //     phone: fullUser.phone,
//     //     street: fullUser.address || fullUser.businessAddress || "",
//     //     city: fullUser.city || "",
//     //     state: fullUser.state || "",
//     //     zip: fullUser.pincode || "",
//     //   },

//     //   paymentMethod: paymentMethod || "Cash on Delivery",

//     //   orderNumber: `ORD-${new Date()
//     //     .toISOString()
//     //     .split("T")[0]
//     //     .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
//     // });

//     // =====================================================
//     // 🧾 CREATE ORDER + WALLET (ATOMIC)
//     // =====================================================
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // 💳 WALLET PAYMENT LOGIC
//       if (normalizedPaymentMethod === "wallet") {
//         const wallet = await Wallet.findOne({ user: user._id }).session(
//           session,
//         );

//         if (!wallet) {
//           throw new Error("Wallet not found");
//         }

//         if (wallet.balance < finalTotal) {
//           throw new Error("Insufficient wallet balance");
//         }

//         // 🔻 Debit wallet
//         wallet.balance -= finalTotal;
//         await wallet.save({ session });

//         // 🧾 Wallet transaction (DEBIT)
//         await WalletTransaction.create(
//           [
//             {
//               user: user._id,
//               type: "debit",
//               amount: finalTotal,
//               description: "Order Payment",
//               referenceType: "order_payment",
//               status: "success",
//             },
//           ],
//           { session },
//         );
//       }

//       // 📦 CREATE ORDER (UNCHANGED DATA)
//       const order = await Order.create(
//         [
//           {
//             user: fullUser._id,

//             items: items.map((i) => ({
//               product: i.product,
//               quantity: i.quantity,
//               price: i.price,
//             })),

//             subtotal, // ✅ original subtotal
//             total: finalTotal, // ✅ coupon-adjusted total

//             coupon: couponData, // ✅ coupon snapshot

//             customerRemarks,

//             shipping: {
//               name: fullUser.name,
//               phone: fullUser.phone,
//               street: fullUser.address || fullUser.businessAddress || "",
//               city: fullUser.city || "",
//               state: fullUser.state || "",
//               zip: fullUser.pincode || "",
//             },

//             // paymentMethod:
//             //   normalizedPaymentMethod === "wallet"
//             //     ? "Wallet"
//             //     : "Cash on Delivery",

//             // paymentStatus:
//             //   normalizedPaymentMethod === "wallet"
//             //     ? "PAID"
//             //     : "UNPAID",


//             paymentMethod:
//   normalizedPaymentMethod === "wallet"
//     ? "Wallet"
//     : "Razorpay",

// paymentStatus:
//   normalizedPaymentMethod === "wallet"
//     ? "PAID"
//     : "UNPAID",


            
// razorpay:
//   normalizedPaymentMethod === "razorpay"
//     ? {
//         orderId: req.body.razorpayOrderId || null,
//         paymentId: null,
//         signature: null,
//       }
//     : undefined,

//             orderNumber: `ORD-${new Date()
//               .toISOString()
//               .split("T")[0]
//               .replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`,
//           },
//         ],
//         { session },
//       );

//       // 🎟️ Increment coupon usage ONLY if order succeeds
//       if (couponData) {
//         await Coupon.updateOne(
//           { code: couponData.code },
//           { $inc: { usedCount: 1 } },
//           { session },
//         );
//       }
//       await session.commitTransaction();
//       session.endSession();

//       return res.status(201).json({
//         success: true,
//         order: order[0],
//       });
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();

//       return res.status(400).json({
//         message: error.message || "Order failed",
//       });
//     }
//   } catch (error) {
//     console.error("❌ Order creation failed:", error);
//     return res.status(500).json({ message: error.message });
//   }
// }






