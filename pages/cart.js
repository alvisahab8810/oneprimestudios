// // pages/cart.js
// "use client";

// import Link from "next/link";
// import toast from "react-hot-toast";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import DealBanner from "@/components/home-page/Cta";
// import FaqAccordion from "@/components/home-page/Faq";
// import Offcanvas from "@/components/header/Offcanvas";

// export default function CartPage() {
//   // These Coupon States

//   const [couponCode, setCouponCode] = useState("");
//   const [appliedCoupon, setAppliedCoupon] = useState(null);
//   // appliedCoupon = { code, discount }
//   const [applyingCoupon, setApplyingCoupon] = useState(false);

//   const [cartItems, setCartItems] = useState([]);
//   const [tempQty, setTempQty] = useState({}); // { [index]: "123" } - string for free typing
//   const [removingIndex, setRemovingIndex] = useState(null);
//   const [confirmRemove, setConfirmRemove] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   // Build quantity ladders based on product tiers & min qty
//   const buildQuantityLadder = (product) => {
//     if (!product) return [1];

//     const minQty = Number(product.minOrderQty || 1);

//     // collect tier quantities
//     const tierQtys = (product.pricingTiers || [])
//       .map((t) => Number(t.minQty))
//       .filter((n) => !isNaN(n) && n > 0);

//     const all = Array.from(new Set([minQty, ...tierQtys])).sort(
//       (a, b) => a - b,
//     );

//     return all;
//   };

//   // fetch cart from API
//   const fetchCart = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Please login to view your cart");
//       router.push("/login");
//       return;
//     }
//     try {
//       setLoading(true);
//       const res = await axios.get("/api/cart", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const items = res.data || [];
//       setCartItems(items);

//       // initialize tempQty from server quantities
//       const initial = {};
//       items.forEach((it, i) => {
//         // ensure default to minOrderQty if smaller for safety
//         const min = it.product?.minOrderQty ?? 1;
//         const qty = Number(it.quantity) < min ? min : Number(it.quantity);
//         initial[i] = String(qty);
//       });
//       setTempQty(initial);
//     } catch (err) {
//       console.error(err);
//       toast.error(err?.response?.data?.message || "Failed to load cart");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCart();
//   }, []);

//   // helper to refresh cart and keep tempQty in sync
//   const refreshCart = async () => {
//     await fetchCart();
//   };

//   // Update quantity on server
//   const updateQuantity = async (index, numericQty) => {
//     // numericQty should already be validated >= min before calling
//     if (typeof numericQty !== "number" || isNaN(numericQty)) return;

//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Please login to update cart");
//       router.push("/login");
//       return;
//     }

//     try {
//       // optimistic UI: set temp + cartItems immediately
//       setTempQty((prev) => ({ ...prev, [index]: String(numericQty) }));
//       setCartItems((prev) => {
//         const next = [...prev];
//         next[index] = { ...next[index], quantity: numericQty };
//         return next;
//       });

//       await axios.put(
//         "/api/cart",
//         { itemIndex: index, quantity: numericQty },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );

//       // re-sync with server canonical state
//       await refreshCart();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to update quantity");
//       await refreshCart();
//     }
//   };

//   // called while user types in input — allow empty string and digits only
//   const handleQtyInputChange = (index, rawValue) => {
//     // allow empty so user can delete and type
//     if (rawValue === "") {
//       setTempQty((prev) => ({ ...prev, [index]: "" }));
//       return;
//     }

//     // allow only numeric characters (no negative)
//     const cleaned = rawValue.replace(/[^\d]/g, "");
//     setTempQty((prev) => ({ ...prev, [index]: cleaned }));
//   };

//   // called when user leaves input: validate and update
//   const handleQtyBlur = (index) => {
//     const item = cartItems[index];
//     if (!item) return;

//     const ladder = buildQuantityLadder(item.product);
//     const raw = tempQty[index];

//     if (!raw || raw.trim() === "") {
//       const min = ladder[0];
//       toast.error(`Minimum quantity is ${min}`);
//       setTempQty((p) => ({ ...p, [index]: String(min) }));
//       return updateQuantity(index, min);
//     }

//     let num = Number(raw);
//     if (isNaN(num)) num = ladder[0];

//     // Snap to nearest tier
//     let nearest = ladder[0];
//     for (let i = 0; i < ladder.length; i++) {
//       if (num <= ladder[i]) {
//         nearest = ladder[i];
//         break;
//       }
//     }

//     setTempQty((p) => ({ ...p, [index]: String(nearest) }));
//     updateQuantity(index, nearest);
//   };

//   // handy keyboard handler: Enter triggers blur/validate
//   const handleQtyKeyDown = (e, index) => {
//     if (e.key === "Enter") {
//       e.currentTarget.blur();
//     }
//   };

//   // Remove item API
//   const removeItem = async (index) => {
//     setRemovingIndex(index);
//     const token = localStorage.getItem("token");
//     try {
//       await axios.delete("/api/cart", {
//         headers: { Authorization: `Bearer ${token}` },
//         data: { itemIndex: index },
//       });
//       toast.success("Item removed");
//       await refreshCart();
//     } catch (err) {
//       console.error(err);
//       toast.error(err?.response?.data?.message || "Failed to remove item");
//       await refreshCart();
//     } finally {
//       setRemovingIndex(null);
//       setConfirmRemove(null);
//     }
//   };

//   const total = cartItems.reduce((acc, it) => {
//     const unitPrice = Number(it.price || 0);
//     const q = Number(it.quantity || 0);
//     return acc + unitPrice * q;
//   }, 0);

//   // ✅ ADD THIS
//   const finalAmount = appliedCoupon
//     ? Math.max(total - appliedCoupon.discount, 0)
//     : total;

//   const getImageUrl = (imgPath) => {
//     if (!imgPath) return "/no-image.png";
//     if (/^https?:\/\//.test(imgPath)) return imgPath;
//     if (typeof window !== "undefined")
//       return `${window.location.origin}${imgPath}`;
//     return imgPath;
//   };

//   // for coupon genration function

//   const applyCoupon = async () => {
//     if (!couponCode.trim()) {
//       toast.error("Please enter a coupon code");
//       return;
//     }

//     try {
//       setApplyingCoupon(true);
//       const token = localStorage.getItem("token");

//       const res = await axios.post(
//         "/api/coupons/apply",
//         {
//           code: couponCode,
//           cartTotal: total,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );

//       const couponData = {
//         code: res.data.coupon.code,
//         discount: res.data.discount,
//       };

//       setAppliedCoupon(couponData);

//       // ✅ ADD THIS (VERY IMPORTANT)
//       localStorage.setItem("appliedCoupon", JSON.stringify(couponData));

//       toast.success("Coupon applied successfully");
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Invalid coupon");
//       setAppliedCoupon(null);
//     } finally {
//       setApplyingCoupon(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="cart-loader-wrapper">
//         <div className="cart-loader-box">
//           <div className="cart-loader-animation"></div>

//           <h4 className="cart-loader-text">Loading your cart...</h4>
//         </div>

//         <style jsx>{`
//           .cart-loader-wrapper {
//             height: 100vh;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             background: #f7f9fc;
//           }

//           .cart-loader-box {
//             text-align: center;
//             animation: fadeIn 0.6s ease-out;
//           }

//           .cart-loader-animation {
//             width: 70px;
//             height: 70px;
//             margin: 0 auto 20px;
//             border-radius: 50%;
//             border: 6px solid #d9d9ff;
//             border-top-color: #6a5cff;
//             border-right-color: #6a5cff;
//             animation:
//               cart-spin 1s linear infinite,
//               pulse 1.5s ease-in-out infinite;
//             box-shadow: 0 0 20px rgba(106, 92, 255, 0.3);
//           }

//           @keyframes cart-spin {
//             from {
//               transform: rotate(0deg);
//             }
//             to {
//               transform: rotate(360deg);
//             }
//           }

//           @keyframes pulse {
//             0% {
//               transform: scale(1);
//             }
//             50% {
//               transform: scale(1.15);
//             }
//             100% {
//               transform: scale(1);
//             }
//           }

//           .cart-loader-text {
//             font-size: 18px;
//             font-weight: 600;
//             color: #555;
//             letter-spacing: 0.3px;
//             animation: blinkFade 1.6s infinite ease-in-out;
//           }

//           @keyframes blinkFade {
//             0% {
//               opacity: 0.7;
//             }
//             50% {
//               opacity: 1;
//             }
//             100% {
//               opacity: 0.7;
//             }
//           }

//           @keyframes fadeIn {
//             from {
//               opacity: 0;
//               transform: translateY(20px);
//             }
//             to {
//               opacity: 1;
//               transform: translateY(0);
//             }
//           }

//           /* Mobile responsive */
//           @media (max-width: 480px) {
//             .cart-loader-animation {
//               width: 55px;
//               height: 55px;
//             }
//             .cart-loader-text {
//               font-size: 16px;
//             }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   if (!cartItems.length) {
//     return (
//       <div className="wishlist-main-page">
//         <Topbar />

//         <div className="container text-center empty-wishlist-area">
//           <img src="/assets/images/empty-cart.png" alt="Empty Cart" />

//           <h3>Your Cart is Empty</h3>
//           {/* <p className="text-muted mb-4">
//               Looks like you haven’t added anything yet. Your designs will still
//               be available in <strong>My Projects</strong>.
//             </p> */}

//           <Link href="/products" className="continue-shoppin-btn">
//             <i className="bi bi-arrow-left me-2"></i> Continue Shopping
//           </Link>
//         </div>

//         <Footer />
//       </div>
//     );
//   }

//   return (
//     <div className="cart-page-area">
//       <Topbar />
//       <Offcanvas />

//       <div className="container padding-top-40 ">
//         {/* <h2 className="mb-4 fw-bold cart-m-heading">Your Cart</h2> */}
//         {/* NEW CART LAYOUT */}
//         <div className="cart-layout">
//           {/* LEFT SIDE – CART ITEMS */}
//           <div className="cart-items-wrapper">
//             {cartItems.map((item, idx) => {
//               const minQty = item.product?.minOrderQty ?? 1;

//               const qtyDisplay =
//                 Number(item.quantity) < minQty ? minQty : Number(item.quantity);

//               const tempValue =
//                 tempQty[idx] !== undefined ? tempQty[idx] : String(qtyDisplay);

//               const unitPrice = Number(item.price || 0);
//               const subtotal = unitPrice * Number(item.quantity || 0);

//               return (
//                 <div key={idx} className="cart-card">
//                   {/* REMOVE BUTTON */}
//                   <button
//                     className="cart-remove"
//                     onClick={() => setConfirmRemove(idx)}
//                   >
//                     ✕
//                   </button>

//                   {/* PRODUCT IMAGE */}
//                   <div className="cart-card-img">
//                     <img
//                       src={getImageUrl(item.product?.mainImage)}
//                       alt={item.product?.name || "Product"}
//                       onError={(e) => (e.currentTarget.src = "/no-image.png")}
//                     />
//                   </div>

//                   {/* PRODUCT INFO */}
//                   <div className="cart-card-content">
//                     <h4 className="cart-name">{item.product?.name}</h4>


                    
//                     {/* <p className="cart-unit-price">₹{unitPrice.toFixed(2)}</p> */}
//                     <div className="cart-subtotal">₹{subtotal.toFixed(2)}</div>

//                     {/* QTY BUTTONS */}
//                     <div className="cart-qty-row">
//                       <button
//                         onClick={() => {
//                           const ladder = buildQuantityLadder(item.product);
//                           const current = Number(tempValue);

//                           // find previous tier
//                           let prev = ladder[0];
//                           for (let i = ladder.length - 1; i >= 0; i--) {
//                             if (ladder[i] < current) {
//                               prev = ladder[i];
//                               break;
//                             }
//                           }

//                           setTempQty((p) => ({ ...p, [idx]: String(prev) }));
//                           updateQuantity(idx, prev);
//                         }}
//                       >
//                         -
//                       </button>

//                       <input
//                         type="text"
//                         value={tempValue}
//                         onChange={(e) =>
//                           handleQtyInputChange(idx, e.target.value)
//                         }
//                         onBlur={() => handleQtyBlur(idx)}
//                         onKeyDown={(e) => handleQtyKeyDown(e, idx)}
//                       />

//                       <button
//                         onClick={() => {
//                           const ladder = buildQuantityLadder(item.product);
//                           const current = Number(tempValue);

//                           // find next tier
//                           let next = ladder[ladder.length - 1];
//                           for (let i = 0; i < ladder.length; i++) {
//                             if (ladder[i] > current) {
//                               next = ladder[i];
//                               break;
//                             }
//                           }

//                           setTempQty((p) => ({ ...p, [idx]: String(next) }));
//                           updateQuantity(idx, next);
//                         }}
//                       >
//                         +
//                       </button>
//                     </div>

//                     {/* ATTRIBUTES */}
//                     {/* <div className="cart-attrs">
//               {item.selectedAttrs &&
//               Object.keys(item.selectedAttrs).length ? (
//                 Object.entries(item.selectedAttrs).map(([k, v]) => (
//                   <div key={k} className="cart-attr-item">
//                     <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : v}
//                   </div>
//                 ))
//               ) : (
//                 <small className="text-muted">—</small>
//               )}
//             </div> */}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>

//           {/* RIGHT SIDE – SUMMARY CARD */}
//           <div className="cart-summary-card">
//             <h5 className="cart-summary-title">Summary</h5>

//             {/* <div className="promo-row">
//               <input type="text" placeholder="Promo code" />
//               <button>Apply</button>
//             </div> */}

//             <div className="promo-row">
//               <input
//                 type="text"
//                 placeholder="Promo code"
//                 value={couponCode}
//                 disabled={!!appliedCoupon}
//                 onChange={(e) => setCouponCode(e.target.value)}
//               />

//               {appliedCoupon ? (
//                 <button
//                   onClick={() => {
//                     setAppliedCoupon(null);
//                     setCouponCode("");
//                     localStorage.removeItem("appliedCoupon"); // ✅ ADD
//                     toast.success("Coupon removed");
//                   }}
//                 >
//                   Remove
//                 </button>
//               ) : (
//                 <button onClick={applyCoupon} disabled={applyingCoupon}>
//                   {applyingCoupon ? "Applying..." : "Apply"}
//                 </button>
//               )}
//             </div>

//             <div className="summary-line">
//               <span>Sub-total</span>
//               <strong>₹{total.toFixed(2)}</strong>
//             </div>

//             <div className="summary-line">
//               <span>Voucher</span>
//               <strong className="text-success">
//                 {appliedCoupon ? `-₹${appliedCoupon.discount.toFixed(2)}` : "-"}
//               </strong>
//             </div>

//             {/* <div className="summary-line">
//               <span>Delivery Fee</span>
//               <strong>-</strong>
//             </div> */}

//             <hr />

//             {/* <div className="summary-total">
//               <span>Total Amount</span>
//               <strong>₹{total.toFixed(2)}</strong>
//             </div> */}

//             <div className="summary-total">
//               <span>Total Amount</span>
//               <strong>₹{finalAmount.toFixed(2)}</strong>
//             </div>

//             <div className="mobile-none">
//               <button
//                 className="summary-checkout"
//                 onClick={() => router.push("/checkout")}
//               >
//                 Continue to Pay
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Remove confirmation modal */}
//         {confirmRemove !== null && (
//           <div
//             className="confirm-remove modal fade show d-block"
//             tabIndex="-1"
//             style={{ background: "rgba(0,0,0,0.5)" }}
//           >
//             <div className="modal-dialog modal-dialog-centered">
//               <div className="modal-content rounded-4">
//                 <div className="modal-header border-0">
//                   <h5 className="modal-title fw-bold">
//                     Remove Item from Cart?
//                   </h5>
//                 </div>
//                 <div className="modal-body">
//                   <p className="mb-0">
//                     Are you sure you want to remove this item from your cart?
//                     <br />
//                     <strong>
//                       Your design will still be available in My Projects.
//                     </strong>
//                   </p>
//                 </div>
//                 <div className="modal-footer border-0">
//                   <button
//                     className="btn btn-secondary"
//                     onClick={() => setConfirmRemove(null)}
//                   >
//                     No, thanks
//                   </button>
//                   <button
//                     className="btn btn-danger"
//                     onClick={() => removeItem(confirmRemove)}
//                     disabled={removingIndex !== null}
//                   >
//                     {removingIndex === confirmRemove ? (
//                       <span
//                         className="spinner-border spinner-border-sm"
//                         role="status"
//                       />
//                     ) : (
//                       "Yes, remove"
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* MOBILE STICKY CHECKOUT BUTTON */}
//       <div className="mobile-cart-sticky desktop-none">
//         <button
//           className="mobile-cart-button"
//           onClick={() => router.push("/checkout")}
//         >
//           Continue to Pay
//           {/* ₹{total.toFixed(2)} */}₹{finalAmount.toFixed(2)}
//         </button>
//       </div>

//       <ProductSlider />

//       <div className="container">
//         <DealBanner />
//         <FaqAccordion />
//       </div>
//       <Footer />
//     </div>
//   );
// }




// pages/cart.js
"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import ProductSlider from "@/components/home-page/ProductSlider";
import DealBanner from "@/components/home-page/Cta";
import FaqAccordion from "@/components/home-page/Faq";
import Offcanvas from "@/components/header/Offcanvas";
import { buildQuantityLadder, getMinOrderQty, isOutOfStock } from "@/lib/stockRules";

export default function CartPage() {

  const getFileType = (url = "") => {
  const ext = url.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
};





  // These Coupon States

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  // appliedCoupon = { code, discount }
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Offers the buyer can actually use, listed so a code never has to be typed
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  // A code picked on a product page is applied once, when the offers load
  const pendingHandled = useRef(false);

  const [cartItems, setCartItems] = useState([]);
  const [tempQty, setTempQty] = useState({}); // { [index]: "123" } - string for free typing
  const [removingIndex, setRemovingIndex] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Quantity ladder comes from the shared rules so tiers below the MOQ are dropped


  
  // fetch cart from API
  const fetchCart = async () => {

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to view your cart");
      router.push("/login");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

       console.log("🛒 CART API RESPONSE:", res.data); // 🔍 keep for now
      const items = res.data || [];
      setCartItems(items);

      // initialize tempQty from server quantities
      const initial = {};
      items.forEach((it, i) => {
        // ensure default to minOrderQty if smaller for safety
        const min = it.product?.minOrderQty ?? 1;
        const qty = Number(it.quantity) < min ? min : Number(it.quantity);
        initial[i] = String(qty);
      });
      setTempQty(initial);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // helper to refresh cart and keep tempQty in sync
  const refreshCart = async () => {
    await fetchCart();
  };

  // Update quantity on server
  const updateQuantity = async (index, numericQty) => {
    // numericQty should already be validated >= min before calling
    if (typeof numericQty !== "number" || isNaN(numericQty)) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to update cart");
      router.push("/login");
      return;
    }

    try {
      // optimistic UI: set temp + cartItems immediately
      setTempQty((prev) => ({ ...prev, [index]: String(numericQty) }));
      setCartItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], quantity: numericQty };
        return next;
      });

      await axios.put(
        "/api/cart",
        { itemIndex: index, quantity: numericQty },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // re-sync with server canonical state
      await refreshCart();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update quantity");
      await refreshCart();
    }
  };

  // called while user types in input — allow empty string and digits only
  const handleQtyInputChange = (index, rawValue) => {
    // allow empty so user can delete and type
    if (rawValue === "") {
      setTempQty((prev) => ({ ...prev, [index]: "" }));
      return;
    }

    // allow only numeric characters (no negative)
    const cleaned = rawValue.replace(/[^\d]/g, "");
    setTempQty((prev) => ({ ...prev, [index]: cleaned }));
  };

  // called when user leaves input: validate and update
  const handleQtyBlur = (index) => {
    const item = cartItems[index];
    if (!item) return;

    const ladder = buildQuantityLadder(item.product);
    const raw = tempQty[index];

    if (!raw || raw.trim() === "") {
      const min = ladder[0];
      toast.error(`Minimum quantity is ${min}`);
      setTempQty((p) => ({ ...p, [index]: String(min) }));
      return updateQuantity(index, min);
    }

    let num = Number(raw);
    if (isNaN(num)) num = ladder[0];

    // Snap up to the next tier; anything above the last tier keeps the typed quantity
    let nearest = ladder.find((step) => num <= step);
    if (nearest === undefined) nearest = num;
    if (nearest < ladder[0]) nearest = ladder[0];

    setTempQty((p) => ({ ...p, [index]: String(nearest) }));
    updateQuantity(index, nearest);
  };

  // handy keyboard handler: Enter triggers blur/validate
  const handleQtyKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Remove item API
  const removeItem = async (index) => {
    setRemovingIndex(index);
    const token = localStorage.getItem("token");
    try {
      await axios.delete("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
        data: { itemIndex: index },
      });
      toast.success("Item removed");
      await refreshCart();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to remove item");
      await refreshCart();
    } finally {
      setRemovingIndex(null);
      setConfirmRemove(null);
    }
  };

  const total = cartItems.reduce((acc, it) => {
    const unitPrice = Number(it.price || 0);
    const q = Number(it.quantity || 0);
    return acc + unitPrice * q;
  }, 0);

  const gstAmount = cartItems.reduce((acc, it) => {
    const gstPct = Number(it.product?.gstPercent || 0);
    return acc + (Number(it.price || 0) * Number(it.quantity || 0) * gstPct / 100);
  }, 0);

  const discountedSubtotal = appliedCoupon ? Math.max(total - appliedCoupon.discount, 0) : total;
  const finalAmount = discountedSubtotal + gstAmount;

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

  // Offers are listed for whatever the cart is worth right now, so a coupon
  // that needs a bigger order shows how much more is needed
  useEffect(() => {
    if (loading || cartItems.length === 0) {
      setOffers([]);
      return;
    }
    let cancelled = false;
    const loadOffers = async () => {
      try {
        setOffersLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/coupons/available?cartTotal=${total}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        if (!cancelled) setOffers(res.data.offers || []);
      } catch {
        // Without the list the buyer can still type a code
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    };
    loadOffers();
    return () => { cancelled = true; };
  }, [loading, cartItems.length, total]);

  // A code the buyer tapped "Apply" on from a product page. It is applied here,
  // where the order total is known, and only when it is actually usable — so
  // arriving at the cart never greets the buyer with an error.
  useEffect(() => {
    if (pendingHandled.current || appliedCoupon || offersLoading || offers.length === 0) return;

    let pending = "";
    try {
      pending = localStorage.getItem("pendingCoupon") || "";
    } catch {
      pending = "";
    }
    if (!pending) return;

    pendingHandled.current = true;
    try {
      localStorage.removeItem("pendingCoupon");
    } catch {
      // Nothing to clean up if storage is unavailable
    }

    const offer = offers.find((o) => o.code === pending);
    if (offer?.eligible) {
      applyCoupon(offer.code);
    } else {
      // Not usable yet: the code is filled in and the reason is on its card
      setCouponCode(pending);
      setShowOffers(true);
      if (offer?.reason) toast.error(offer.reason);
    }
  }, [offers, offersLoading, appliedCoupon]);

  // for coupon genration function

  // Called both by the Apply button and by tapping an offer card
  const applyCoupon = async (codeFromOffer) => {
    const code = String(codeFromOffer || couponCode || "").trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      setApplyingCoupon(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "/api/coupons/apply",
        {
          code,
          cartTotal: total,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const couponData = {
        code: res.data.coupon.code,
        discount: res.data.discount,
      };

      setAppliedCoupon(couponData);
      setCouponCode(couponData.code);

      // ✅ ADD THIS (VERY IMPORTANT)
      localStorage.setItem("appliedCoupon", JSON.stringify(couponData));
      setShowOffers(false);

      toast.success(`${couponData.code} applied — you saved ₹${Number(couponData.discount).toFixed(2)}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`${code} copied`);
      setTimeout(() => setCopiedCode((c) => (c === code ? "" : c)), 2000);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    localStorage.removeItem("appliedCoupon");
    toast.success("Coupon removed");
  };

  if (loading) {
    return (
      <div className="cart-loader-wrapper">
        <div className="cart-loader-box">
          <div className="cart-loader-animation"></div>

          <h4 className="cart-loader-text">Loading your cart...</h4>
        </div>

        <style jsx>{`
          .cart-loader-wrapper {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f7f9fc;
          }

          .cart-loader-box {
            text-align: center;
            animation: fadeIn 0.6s ease-out;
          }

          .cart-loader-animation {
            width: 70px;
            height: 70px;
            margin: 0 auto 20px;
            border-radius: 50%;
            border: 6px solid #d9d9ff;
            border-top-color: #6a5cff;
            border-right-color: #6a5cff;
            animation:
              cart-spin 1s linear infinite,
              pulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 20px rgba(106, 92, 255, 0.3);
          }

          @keyframes cart-spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.15);
            }
            100% {
              transform: scale(1);
            }
          }

          .cart-loader-text {
            font-size: 18px;
            font-weight: 600;
            color: #555;
            letter-spacing: 0.3px;
            animation: blinkFade 1.6s infinite ease-in-out;
          }

          @keyframes blinkFade {
            0% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.7;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Mobile responsive */
          @media (max-width: 480px) {
            .cart-loader-animation {
              width: 55px;
              height: 55px;
            }
            .cart-loader-text {
              font-size: 16px;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="wishlist-main-page">
        <Topbar />

        <div className="container text-center empty-wishlist-area">
          <img src="/assets/images/empty-cart.png" alt="Empty Cart" />

          <h3>Your Cart is Empty</h3>
          {/* <p className="text-muted mb-4">
              Looks like you haven’t added anything yet. Your designs will still
              be available in <strong>My Projects</strong>.
            </p> */}

          <Link href="/products" className="continue-shoppin-btn">
            <i className="bi bi-arrow-left me-2"></i> Continue Shopping
          </Link>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="cart-page-area">
      <Topbar />
      <Offcanvas />

      <div className="container padding-top-40 ">
        {/* <h2 className="mb-4 fw-bold cart-m-heading">Your Cart</h2> */}
        {/* NEW CART LAYOUT */}
        <div className="cart-layout">
          {/* LEFT SIDE – CART ITEMS */}
          <div className="cart-items-wrapper">
            {cartItems.map((item, idx) => {
              const minQty = item.product?.minOrderQty ?? 1;

              const qtyDisplay =
                Number(item.quantity) < minQty ? minQty : Number(item.quantity);

              const tempValue =
                tempQty[idx] !== undefined ? tempQty[idx] : String(qtyDisplay);

              const unitPrice = Number(item.price || 0);
              const subtotal = unitPrice * Number(item.quantity || 0);

              return (
                <div key={idx} className="cart-card">
                  {/* REMOVE BUTTON */}
                  <button
                    className="cart-remove"
                    onClick={() => setConfirmRemove(idx)}
                  >
                    ✕
                  </button>

                  {/* PRODUCT IMAGE */}
                  <div className="cart-card-img">
                    <img
                      src={getImageUrl(item.product?.mainImage)}
                      alt={item.product?.name || "Product"}
                      onError={(e) => (e.currentTarget.src = "/no-image.png")}
                    />
                  </div>

                  {/* PRODUCT INFO */}
                  <div className="cart-card-content">
                    <h4 className="cart-name">{item.product?.name}</h4>


                    {/* 🔹 LEGACY FILE PREVIEW */}
{Array.isArray(item.uploadedFiles) &&
  item.uploadedFiles.map((fileUrl, i) => (
    <div key={i} className="cart-file-preview">
      {getFileType(fileUrl) === "image" ? (
        <img
          src={getImageUrl(fileUrl)}
          className="cart-preview-img"
          alt="Design"
        />
      ) : (
        <a href={getImageUrl(fileUrl)} target="_blank">
          📄 View File
        </a>
      )}
    </div>
  ))}

{/* 🔹 ATTRIBUTE FILE PREVIEW */}
{Array.isArray(item.uploadedAttributeFiles) &&
  item.uploadedAttributeFiles.map((file, i) => (
    <div key={i} className="cart-file-preview">
      <small className="text-muted">{file.attributeName}</small>

      {getFileType(file.url) === "image" ? (
        <img
          src={getImageUrl(file.url)}
          className="cart-preview-img"
          alt={file.name}
        />
      ) : (
        <a href={getImageUrl(file.url)} target="_blank">
          📄 {file.name}
        </a>
      )}
    </div>
  ))}



                    
                    {/* <p className="cart-unit-price">₹{unitPrice.toFixed(2)}</p> */}
                    <div className="cart-subtotal">₹{subtotal.toFixed(2)}</div>

                    {/* QTY BUTTONS */}
                    <div className="cart-qty-row">
                      <button
                        onClick={() => {
                          const ladder = buildQuantityLadder(item.product);
                          const current = Number(tempValue);

                          // find previous tier
                          let prev = ladder[0];
                          for (let i = ladder.length - 1; i >= 0; i--) {
                            if (ladder[i] < current) {
                              prev = ladder[i];
                              break;
                            }
                          }

                          setTempQty((p) => ({ ...p, [idx]: String(prev) }));
                          updateQuantity(idx, prev);
                        }}
                      >
                        -
                      </button>

                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) =>
                          handleQtyInputChange(idx, e.target.value)
                        }
                        onBlur={() => handleQtyBlur(idx)}
                        onKeyDown={(e) => handleQtyKeyDown(e, idx)}
                      />

                      <button
                        onClick={() => {
                          const ladder = buildQuantityLadder(item.product);
                          const current = Number(tempValue);

                          // find next tier
                          let next = ladder[ladder.length - 1];
                          for (let i = 0; i < ladder.length; i++) {
                            if (ladder[i] > current) {
                              next = ladder[i];
                              break;
                            }
                          }

                          setTempQty((p) => ({ ...p, [idx]: String(next) }));
                          updateQuantity(idx, next);
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* ATTRIBUTES */}
                    {/* <div className="cart-attrs">
              {item.selectedAttrs &&
              Object.keys(item.selectedAttrs).length ? (
                Object.entries(item.selectedAttrs).map(([k, v]) => (
                  <div key={k} className="cart-attr-item">
                    <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : v}
                  </div>
                ))
              ) : (
                <small className="text-muted">—</small>
              )}
            </div> */}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT SIDE – SUMMARY CARD */}
          <div className="cart-summary-card">
            <h5 className="cart-summary-title">Summary</h5>

            {/* <div className="promo-row">
              <input type="text" placeholder="Promo code" />
              <button>Apply</button>
            </div> */}

            <div className="promo-row">
              <input
                type="text"
                placeholder="Promo code"
                value={couponCode}
                disabled={!!appliedCoupon}
                onChange={(e) => setCouponCode(e.target.value)}
              />

              {appliedCoupon ? (
                <button onClick={removeCoupon}>
                  Remove
                </button>
              ) : (
                <button onClick={() => applyCoupon()} disabled={applyingCoupon}>
                  {applyingCoupon ? "Applying..." : "Apply"}
                </button>
              )}
            </div>

            {/* ── Available offers — tap one to apply, no typing needed ── */}
            {!appliedCoupon && (offers.length > 0 || offersLoading) && (
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowOffers((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", background: "#fff7ed", border: "1px dashed #fdba74",
                    borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
                    {offersLoading
                      ? "Checking for offers..."
                      : `${offers.length} offer${offers.length > 1 ? "s" : ""} available`}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}>
                    {showOffers ? "Hide" : "View offers"}
                  </span>
                </button>

                {showOffers && !offersLoading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {offers.map((o) => (
                      <div
                        key={o.code}
                        style={{
                          border: "1px solid #eee", borderRadius: 10, padding: "10px 12px",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 10, opacity: o.eligible ? 1 : 0.75,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5,
                              background: "#f3f4f6", color: "#111", border: "1px dashed #d1d5db",
                              borderRadius: 5, padding: "2px 7px",
                            }}>
                              {o.code}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{o.headline}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3 }}>
                            {o.eligible
                              ? `Saves ₹${Number(o.discount).toFixed(2)} on this cart`
                              : o.reason}
                            {o.expiryDate && (
                              <> · Valid till {new Date(o.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyCode(o.code)}
                          style={{
                            flexShrink: 0, background: "#fff", color: "#374151",
                            border: "1.5px solid #e5e7eb", borderRadius: 8,
                            padding: "6px 12px", fontSize: 12, fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {copiedCode === o.code ? "Copied" : "Copy"}
                        </button>

                        <button
                          type="button"
                          onClick={() => applyCoupon(o.code)}
                          disabled={!o.eligible || applyingCoupon}
                          style={{
                            flexShrink: 0, background: "none", border: "none",
                            color: o.eligible ? "#c2410c" : "#9ca3af",
                            fontSize: 12.5, fontWeight: 800, letterSpacing: 0.3,
                            cursor: o.eligible && !applyingCoupon ? "pointer" : "not-allowed",
                          }}
                        >
                          APPLY
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="summary-line">
              <span>Sub-total</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>

            <div className="summary-line">
              <span>Voucher</span>
              <strong className="text-success">
                {appliedCoupon ? `-₹${appliedCoupon.discount.toFixed(2)}` : "-"}
              </strong>
            </div>

            {/* <div className="summary-line">
              <span>Delivery Fee</span>
              <strong>-</strong>
            </div> */}

            <hr />

            {/* <div className="summary-total">
              <span>Total Amount</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div> */}

            {gstAmount > 0 && (
              <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13, color: "#6b7280" }}>
                <span>GST</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-total">
              <span>Total Amount</span>
              <strong>₹{finalAmount.toFixed(2)}</strong>
            </div>

            <div className="mobile-none">
              <button
                className="summary-checkout"
                onClick={() => router.push("/checkout")}
              >
                Continue to Pay
              </button>
            </div>
          </div>
        </div>

        {/* Remove confirmation modal */}
        {confirmRemove !== null && (
          <div
            className="confirm-remove modal fade show d-block"
            tabIndex="-1"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold">
                    Remove Item from Cart?
                  </h5>
                </div>
                <div className="modal-body">
                  <p className="mb-0">
                    Are you sure you want to remove this item from your cart?
                    <br />
                    <strong>
                      Your design will still be available in My Projects.
                    </strong>
                  </p>
                </div>
                <div className="modal-footer border-0">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setConfirmRemove(null)}
                  >
                    No, thanks
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => removeItem(confirmRemove)}
                    disabled={removingIndex !== null}
                  >
                    {removingIndex === confirmRemove ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />
                    ) : (
                      "Yes, remove"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY CHECKOUT BUTTON */}
      <div className="mobile-cart-sticky desktop-none">
        <button
          className="mobile-cart-button"
          onClick={() => router.push("/checkout")}
        >
          Continue to Pay
          {/* ₹{total.toFixed(2)} */}₹{finalAmount.toFixed(2)}
        </button>
      </div>

      <ProductSlider />

      <div className="container">
        <DealBanner />
        <FaqAccordion />
      </div>
      <Footer />
    </div>
  );
}
