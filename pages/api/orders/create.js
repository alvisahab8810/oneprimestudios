// pages/api/orders/create.js
// FIX: Copy uploadedFiles and uploadedAttributeFiles from cart items into order items.
// That's the ONLY change — one line in the items.map().
// Everything else (wallet, coupon, Razorpay, auth) is 100% unchanged.

import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import { quoteShipping, shippingQuoteMessage } from "@/lib/shippingQuote";
import { bogoFreeQty, bogoLineSaving } from "@/lib/bogo";
import { checkOrderable } from "@/lib/stockRules";
import { checkDeliverable } from "@/lib/deliveryZones";
import { isCodAvailable } from "@/lib/codRules";
import { couponEligibleTotal, isRestrictedCoupon, couponScopeMessage } from "@/lib/couponRules";
import { loadCouponScope, itemProductIds } from "@/lib/couponScope";
import { isValidGstin, normalizeGstin } from "@/lib/gstin";
import { getLiveCouriers } from "@/lib/courierRates";
import { buildEstimate, cartDispatchDays, transitRange } from "@/lib/deliveryEstimate";
import {
  checkPaymentMatchesOrder,
  fetchPayment,
  isRazorpayConfigured,
  refundQuietly,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import mongoose from "mongoose";
import { priceForQuantity } from "@/lib/productPricing";
import { getLiveDealMap, getFlashProductIds, priceableProduct } from "@/lib/flashSale";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // AUTH
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // OLD: const { items, subtotal, gstAmount = 0, paymentMethod, couponCode } = req.body;
    // NEW: also extract orderName (B2B mandatory field)
    const { items, subtotal, gstAmount = 0, paymentMethod, couponCode, orderName = "" } = req.body;
    // B2B only: the courier the partner chose on the product page, carried
    // here from their cart. Retail orders are routed by the admin instead, so
    // anything sent for them is ignored.
    const chosenCourier = req.body?.preferredCourier || null;

    // Razorpay Checkout hands these three back to the browser; we never trust
    // them as proof of payment until the signature and the amount are verified.
    const rzpOrderId = String(req.body.razorpayOrderId || "").trim();
    const rzpPaymentId = String(req.body.razorpayPaymentId || "").trim();
    const rzpSignature = String(req.body.razorpaySignature || "").trim();

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
    // A partner pays from the wallet, or online when the balance is short
    if (
      fullUser.userType === "partner" &&
      normalizedPaymentMethod !== "wallet" &&
      normalizedPaymentMethod !== "razorpay"
    ) {
      return res.status(403).json({ message: "Partners can pay using Wallet or online" });
    }
    if (
      fullUser.userType === "customer" &&
      normalizedPaymentMethod !== "razorpay" &&
      normalizedPaymentMethod !== "cod"
    ) {
      return res.status(403).json({ message: "Customers can pay online or on delivery only" });
    }
    if (fullUser.userType !== "customer" && normalizedPaymentMethod === "cod") {
      return res.status(403).json({ message: "Cash on delivery is for retail orders only" });
    }

    // ── RAZORPAY: the payment must be real before an order exists ──────────
    if (normalizedPaymentMethod === "razorpay") {
      if (!isRazorpayConfigured()) {
        return res.status(500).json({ message: "Online payments are not configured" });
      }
      if (!rzpOrderId || !rzpPaymentId || !rzpSignature) {
        return res.status(400).json({ message: "Payment details are missing" });
      }
      if (!verifyCheckoutSignature({ orderId: rzpOrderId, paymentId: rzpPaymentId, signature: rzpSignature })) {
        return res.status(400).json({ message: "Payment could not be verified" });
      }
      // The same captured payment must never create a second order
      const alreadyUsed = await Order.exists({ "razorpay.paymentId": rzpPaymentId });
      if (alreadyUsed) {
        return res.status(409).json({ message: "This payment has already been used for an order" });
      }
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
      // A coupon tied to particular products or categories only discounts
      // those lines; one tied to none works on the whole order, as before
      const couponScope = await loadCouponScope(coupon, itemProductIds(items));
      const eligibleTotal = couponEligibleTotal(coupon, items, subtotal, couponScope);
      if (isRestrictedCoupon(coupon) && eligibleTotal <= 0)
        return res.status(400).json({ message: couponScopeMessage(coupon) });
      if (eligibleTotal < (coupon.minOrderAmount || 0))
        return res.status(400).json({ message: `Minimum order ₹${coupon.minOrderAmount} required` });

      let discountAmount = 0;
      if (coupon.discountType === "percentage") {
        discountAmount = (eligibleTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      } else {
        discountAmount = coupon.discountValue;
      }
      discountAmount = Math.min(discountAmount, eligibleTotal);

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

    // TRANSPORT CHARGE — worked out again here so the browser cannot change it.
    // Product names are needed below anyway, so both come from one query.
    const productIds = items.map((i) => i.product);
    const productDocs = await Product.find(
      { _id: { $in: productIds } },
      "name shipping freeDelivery freeDeliveryPincodes stockStatus minOrderQty stock b2cOptions deliveryZones noReturns noExchange dispatchDays"
    ).lean();
    const productMap = {};
    productDocs.forEach((p) => { productMap[String(p._id)] = p; });

    // Stock and minimum order quantity are checked again here — the browser is never trusted
    for (const item of items) {
      const problem = checkOrderable(productMap[String(item.product)], item.quantity);
      if (problem) return res.status(400).json({ message: problem });
    }

    // BUY 1 GET 1 — worked out here from the products themselves, so what the
    // browser shows can never decide what the offer is worth. The subtotal
    // sent up is the full goods total; the saving comes off it below, which
    // is also why a partner can never pick up a retail offer.
    const isPartnerBuyer = fullUser.userType === "partner";
    const bogoFor = (item) =>
      bogoFreeQty(productMap[String(item.product)], item.quantity, { isPartner: isPartnerBuyer });
    const bogoDiscount = Math.round(
      items.reduce(
        (sum, item) =>
          sum +
          bogoLineSaving(productMap[String(item.product)], item.quantity, item.price, {
            isPartner: isPartnerBuyer,
          }),
        0
      ) * 100
    ) / 100;

    if (bogoDiscount > 0) {
      finalTotal = Math.max(finalTotal - bogoDiscount, 0);
    }

    if (normalizedPaymentMethod === "cod") {
      const blocked = items.find(
        (i) => !isCodAvailable(productMap[String(i.product)])
      );
      if (blocked) {
        const name = productMap[String(blocked.product)]?.name || "One of your items";
        return res.status(400).json({
          message: `${name} is not available for cash on delivery. Please pay online instead.`,
        });
      }
    }

    // FLASH SALE — a line priced while a deal was running must not keep the
    // deal price after the deal has ended. Only orders that have not been
    // paid yet are refused; an online payment has already been taken by now.
    if (normalizedPaymentMethod !== "razorpay") {
      const flashIds = await getFlashProductIds(productIds.map(String));
      if (flashIds.size) {
        const [dealMap, flashDocs] = await Promise.all([
          getLiveDealMap([...flashIds]),
          Product.find({ _id: { $in: [...flashIds] } }).lean(),
        ]);
        const flashMap = new Map(flashDocs.map((p) => [String(p._id), p]));
        const stale = items.find((item) => {
          const p = flashMap.get(String(item.product));
          if (!p) return false;
          const due = priceForQuantity(priceableProduct(p, dealMap, fullUser), item.quantity, {
            selectedAttrs: item.selectedAttrs || {},
            city: fullUser.city,
          }).unitPrice;
          return Number(item.price || 0) < due - 0.01;
        });
        if (stale) {
          const name = flashMap.get(String(stale.product))?.name || "An item";
          return res.status(409).json({
            message: `The flash sale for ${name} has ended, so its price has changed. Please open your cart again to see the new total.`,
          });
        }
      }
    }

    // Partners (B2B) are not charged for transport, so no quote is needed for them
    const chargeTransport = fullUser.userType !== "partner";
    let shippingCharge = 0;
    let shippingQuote = null;

    const deliveryPincode = String(
      req.body.shippingAddress?.zip || fullUser.pinCode || ""
    ).trim();

    // Products the admin limited to certain PIN codes are checked against the
    // address this order actually ships to — the browser is never trusted
    for (const item of items) {
      const problem = checkDeliverable(productMap[String(item.product)], deliveryPincode);
      if (problem) return res.status(400).json({ message: problem });
    }

    if (chargeTransport) {
      shippingQuote = await quoteShipping({
        items: items.map((i) => ({
          quantity: i.quantity,
          product: productMap[String(i.product)] || null,
        })),
        deliveryPincode,
        declaredValue: finalTotal,
      });

      // The order is blocked when we cannot deliver there or cannot price the delivery
      if (!shippingQuote.available) {
        return res.status(400).json({ message: shippingQuoteMessage(shippingQuote.reason) });
      }

      shippingCharge = shippingQuote.charge;
      finalTotal += shippingCharge;
    }

    // ESTIMATED DELIVERY — retail orders only. The window promised on the
    // product page is worked out again here for the whole cart and the real
    // delivery address, then kept on the order. A failure to reach the
    // courier never blocks the order; the default transit time is used.
    let estimatedDelivery;
    if (fullUser.userType === "customer") {
      let etds = [];
      try {
        etds = (await getLiveCouriers(deliveryPincode)).map((c) => c.etd);
      } catch (err) {
        console.error("Delivery estimate courier lookup error:", err?.message);
      }
      if (!etds.length && shippingQuote?.etd) etds = [shippingQuote.etd];
      const estimate = buildEstimate({
        dispatchDays: cartDispatchDays(items.map((i) => productMap[String(i.product)])),
        transit: transitRange(etds),
      });
      estimatedDelivery = {
        dispatchBy: new Date(estimate.dispatchBy),
        from: new Date(estimate.from),
        to: new Date(estimate.to),
      };
    }

    // ── RAZORPAY: the captured amount must equal the total we just computed ──
    let rzpPayment = null;
    if (normalizedPaymentMethod === "razorpay") {
      try {
        rzpPayment = await fetchPayment(rzpPaymentId);
      } catch (err) {
        return res.status(400).json({
          message: "Could not confirm your payment with Razorpay. Please contact support before paying again.",
        });
      }

      const mismatch = checkPaymentMatchesOrder(rzpPayment, {
        orderId: rzpOrderId,
        expectedRupees: finalTotal,
      });
      if (mismatch) {
        // Money was taken for something we will not fulfil — send it straight back
        await refundQuietly({
          paymentId: rzpPaymentId,
          amountRupees: Number(rzpPayment.amount) / 100,
          reason: "amount_mismatch",
        });
        return res.status(400).json({
          message: `${mismatch}. Your payment is being refunded — it will reach you in 5-7 working days.`,
        });
      }
    }

    // ── UPDATED: generate orderNumber before session so it's available for wallet tx description
    // OLD: orderNumber generated inside Order.create, so wallet tx had no reference to it
    // NEW: pre-generate orderNumber, create Order first, then create WalletTransaction with referenceId + full description
    // GST details typed at checkout are re-validated here; a partner's details
    // always come from their own profile instead
    const typedGstin = normalizeGstin(req.body?.gstDetails?.gstin);
    const gstDetails =
      fullUser.userType === "customer" && isValidGstin(typedGstin)
        ? {
            gstin: typedGstin,
            businessName: String(req.body?.gstDetails?.businessName || "")
              .trim()
              .slice(0, 120),
          }
        : { gstin: "", businessName: "" };

    const orderNumber = `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;

    // CREATE ORDER + WALLET — atomic
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ── CREATE ORDER FIRST (so we have _id for wallet tx reference) ──────────
      // Snapshot product names so they survive product deletion
      const productNameMap = {};
      productDocs.forEach((p) => { productNameMap[String(p._id)] = p.name; });

      const order = await Order.create(
        [
          {
            user: fullUser._id,
            items: items.map((i) => ({
              product:     i.product,
              productName: productNameMap[String(i.product)] || "",
              noReturns:   !!productMap[String(i.product)]?.noReturns,
              noExchange:  !!productMap[String(i.product)]?.noExchange,
              freeQty:     bogoFor(i),
              quantity:    i.quantity,
              price:       i.price,
              remarks:     i.remarks || "",
              selectedAttrs: i.selectedAttrs || {},
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
            bogoDiscount,
            gstDetails,
            shippingCharge,
            shippingQuote: {
              courierName: shippingQuote?.courierName || "",
              pincode: deliveryPincode,
              weight: shippingQuote?.weight || 0,
              quotedAt: new Date(),
            },
            preferredCourier:
              fullUser.userType === "partner" && chosenCourier?.courierId
                ? {
                    courierId: String(chosenCourier.courierId).trim().slice(0, 40),
                    name: String(chosenCourier.name || "").trim().slice(0, 120),
                    etd: String(chosenCourier.etd || "").trim().slice(0, 60),
                    chosenBy: "partner",
                  }
                : { courierId: "", name: "", etd: "", chosenBy: "" },
            total: finalTotal,
            coupon: couponData,
            estimatedDelivery,
            customerRemarks,

            shipping: {
              name:   fullUser.name,
              phone:  fullUser.phone,
              street: req.body.shippingAddress?.street || fullUser.businessAddress || fullUser.address || "",
              city:   req.body.shippingAddress?.city   || fullUser.city    || "",
              state:  req.body.shippingAddress?.state  || fullUser.state   || "",
              zip:    req.body.shippingAddress?.zip    || fullUser.pinCode || "",
            },

            paymentMethod:
              normalizedPaymentMethod === "wallet"
                ? "Wallet"
                : normalizedPaymentMethod === "cod"
                ? "COD"
                : "Razorpay",
            // Razorpay orders reach this point only after the payment was
            // verified against the gateway, so they are genuinely paid. A cash
            // on delivery order is collected by the courier, so it stays unpaid
            // until someone marks it paid.
            paymentStatus: normalizedPaymentMethod === "cod" ? "UNPAID" : "PAID",

            razorpay:
              normalizedPaymentMethod === "razorpay"
                ? {
                    orderId: rzpOrderId,
                    paymentId: rzpPaymentId,
                    signature: rzpSignature,
                    amountPaid: Number(rzpPayment?.amount) || 0,
                    capturedAt: new Date(),
                  }
                : undefined,

            orderNumber,
            // NEW: B2B order name entered by customer on product page
            orderName: orderName || "",

            // First steps of the production log the buyer can follow
            statusHistory: [
              {
                status: "Order Booked",
                note: "Order placed online (#" + orderNumber + ")",
                by: "Customer",
                at: new Date(),
              },
              ...(items.some((i) => (i.uploadedFiles || []).length)
                ? [
                    {
                      status: "File Uploaded",
                      note: "Print files received with the order",
                      by: "Customer",
                      at: new Date(),
                    },
                  ]
                : []),
            ],
          },
        ],
        { session }
      );

      // ── WALLET PAYMENT — after order so we can reference order._id + orderNumber ──
      if (normalizedPaymentMethod === "wallet") {
        const wallet = await Wallet.findOne({ user: user._id }).session(session);
        if (!wallet) throw new Error("Wallet not found");
        if (wallet.balance < finalTotal) throw new Error("Insufficient wallet balance");

        wallet.balance -= finalTotal;
        await wallet.save({ session });

        // OLD: description: "Order Payment", no referenceId
        // NEW: description includes order number, referenceId links back to order
        await WalletTransaction.create(
          [{
            user: user._id,
            type: "debit",
            amount: finalTotal,
            description: `Order Payment - #${orderNumber}`,
            referenceType: "order_payment",
            referenceId: order[0]._id.toString(),
            status: "success",
          }],
          { session }
        );
      }

      // ── REDUCE STOCK — the condition makes two buyers racing for the last
      // units safe: the second one finds no matching product and the whole
      // order is rolled back.
      for (const item of items) {
        const qty = Number(item.quantity);
        const result = await Product.updateOne(
          { _id: item.product, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { session }
        );
        if (!result.matchedCount) {
          throw new Error(
            `Not enough stock for "${productNameMap[String(item.product)] || "this product"}"`
          );
        }
        // A product that just ran out is marked out of stock, so the storefront agrees
        await Product.updateOne(
          { _id: item.product, stock: { $lte: 0 } },
          { $set: { stockStatus: "out_of_stock" } },
          { session }
        );
      }

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

      // The payment already went through, so a rolled-back order means we are
      // holding money for nothing — refund it before answering.
      if (normalizedPaymentMethod === "razorpay" && rzpPaymentId) {
        await refundQuietly({
          paymentId: rzpPaymentId,
          amountRupees: finalTotal,
          reason: "order_rolled_back",
        });
        return res.status(400).json({
          message: `${error.message || "Order failed"}. Your payment is being refunded — it will reach you in 5-7 working days.`,
        });
      }

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






