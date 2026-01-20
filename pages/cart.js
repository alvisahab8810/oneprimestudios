// pages/cart.js
"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import ProductSlider from "@/components/home-page/ProductSlider";
import DealBanner from "@/components/home-page/Cta";
import FaqAccordion from "@/components/home-page/Faq";
import Offcanvas from "@/components/header/Offcanvas";

export default function CartPage() {
  // These Coupon States

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  // appliedCoupon = { code, discount }
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [tempQty, setTempQty] = useState({}); // { [index]: "123" } - string for free typing
  const [removingIndex, setRemovingIndex] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Build quantity ladders based on product tiers & min qty
  const buildQuantityLadder = (product) => {
    if (!product) return [1];

    const minQty = Number(product.minOrderQty || 1);

    // collect tier quantities
    const tierQtys = (product.pricingTiers || [])
      .map((t) => Number(t.minQty))
      .filter((n) => !isNaN(n) && n > 0);

    const all = Array.from(new Set([minQty, ...tierQtys])).sort(
      (a, b) => a - b,
    );

    return all;
  };

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

    // Snap to nearest tier
    let nearest = ladder[0];
    for (let i = 0; i < ladder.length; i++) {
      if (num <= ladder[i]) {
        nearest = ladder[i];
        break;
      }
    }

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

  // ✅ ADD THIS
  const finalAmount = appliedCoupon
    ? Math.max(total - appliedCoupon.discount, 0)
    : total;

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

  // for coupon genration function

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      setApplyingCoupon(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "/api/coupons/apply",
        {
          code: couponCode,
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

      // ✅ ADD THIS (VERY IMPORTANT)
      localStorage.setItem("appliedCoupon", JSON.stringify(couponData));

      toast.success("Coupon applied successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
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
                <button
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                    localStorage.removeItem("appliedCoupon"); // ✅ ADD
                    toast.success("Coupon removed");
                  }}
                >
                  Remove
                </button>
              ) : (
                <button onClick={applyCoupon} disabled={applyingCoupon}>
                  {applyingCoupon ? "Applying..." : "Apply"}
                </button>
              )}
            </div>

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
//   const [cartItems, setCartItems] = useState([]);
//   const [tempQty, setTempQty] = useState({}); // { [index]: "123" } - string for free typing
//   const [removingIndex, setRemovingIndex] = useState(null);
//   const [confirmRemove, setConfirmRemove] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

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
//         { headers: { Authorization: `Bearer ${token}` } }
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

//     const minQty = item.product?.minOrderQty ?? 1;
//     const raw = tempQty[index];

//     if (!raw || raw.trim() === "") {
//       toast.error(
//         `You cannot enter less than the minimum quantity (${minQty}).`
//       );
//       setTempQty((prev) => ({ ...prev, [index]: String(minQty) }));

//       // Wait briefly so toast shows before re-render
//       setTimeout(() => updateQuantity(index, minQty), 800);
//       return;
//     }

//     const numeric = Number(raw);
//     if (isNaN(numeric) || numeric < minQty) {
//       toast.error(
//         `You cannot enter less than the minimum quantity (${minQty}).`
//       );
//       setTempQty((prev) => ({ ...prev, [index]: String(minQty) }));

//       // Wait briefly so toast shows before re-render
//       setTimeout(() => updateQuantity(index, minQty), 800);
//       return;
//     }

//     // valid: update server if value changed
//     if (numeric !== Number(item.quantity)) {
//       updateQuantity(index, numeric);
//     } else {
//       // keep temp in sync (in case)
//       setTempQty((prev) => ({ ...prev, [index]: String(numeric) }));
//     }
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

//   const getImageUrl = (imgPath) => {
//     if (!imgPath) return "/no-image.png";
//     if (/^https?:\/\//.test(imgPath)) return imgPath;
//     if (typeof window !== "undefined")
//       return `${window.location.origin}${imgPath}`;
//     return imgPath;
//   };

//   if (loading) {
//     return (
//     <div className="cart-loader-wrapper">
//   <div className="cart-loader-box">
//     <div className="cart-loader-animation"></div>

//     <h4 className="cart-loader-text">Loading your cart...</h4>
//   </div>

//   <style jsx>{`
//     .cart-loader-wrapper {
//       height: 100vh;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       background: #f7f9fc;
//     }

//     .cart-loader-box {
//       text-align: center;
//       animation: fadeIn 0.6s ease-out;
//     }

//     .cart-loader-animation {
//       width: 70px;
//       height: 70px;
//       margin: 0 auto 20px;
//       border-radius: 50%;
//       border: 6px solid #d9d9ff;
//       border-top-color: #6a5cff;
//       border-right-color: #6a5cff;
//       animation: cart-spin 1s linear infinite, pulse 1.5s ease-in-out infinite;
//       box-shadow: 0 0 20px rgba(106, 92, 255, 0.3);
//     }

//     @keyframes cart-spin {
//       from { transform: rotate(0deg); }
//       to { transform: rotate(360deg); }
//     }

//     @keyframes pulse {
//       0% { transform: scale(1); }
//       50% { transform: scale(1.15); }
//       100% { transform: scale(1); }
//     }

//     .cart-loader-text {
//       font-size: 18px;
//       font-weight: 600;
//       color: #555;
//       letter-spacing: 0.3px;
//       animation: blinkFade 1.6s infinite ease-in-out;
//     }

//     @keyframes blinkFade {
//       0% { opacity: 0.7; }
//       50% { opacity: 1; }
//       100% { opacity: 0.7; }
//     }

//     @keyframes fadeIn {
//       from { opacity: 0; transform: translateY(20px); }
//       to { opacity: 1; transform: translateY(0); }
//     }

//     /* Mobile responsive */
//     @media (max-width: 480px) {
//       .cart-loader-animation {
//         width: 55px;
//         height: 55px;
//       }
//       .cart-loader-text {
//         font-size: 16px;
//       }
//     }
//   `}</style>
// </div>

//     );
//   }

//   if (!cartItems.length) {
//     return (
//       <div className="wishlist-main-page">
//           <Topbar />

//           <div className="container text-center empty-wishlist-area">

//             <img
//               src="/assets/images/empty-cart.png"
//               alt="Empty Cart"
//             />

//             <h3>Your Cart is Empty</h3>
//             {/* <p className="text-muted mb-4">
//               Looks like you haven’t added anything yet. Your designs will still
//               be available in <strong>My Projects</strong>.
//             </p> */}

//             <Link
//               href="/products"
//               className="continue-shoppin-btn"
//             >
//               <i className="bi bi-arrow-left me-2"></i> Continue Shopping
//             </Link>
//             </div>

//         <Footer />
//       </div>
//     );
//   }

//   return (
//     <div className="cart-page-area">
//       <Topbar />
//       <Offcanvas/>

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
//                           const next = Number(tempValue) - 1;
//                           if (next < minQty) {
//                             toast.error(`Minimum quantity is ${minQty}`);
//                             return updateQuantity(idx, minQty);
//                           }
//                           setTempQty((p) => ({ ...p, [idx]: String(next) }));
//                           updateQuantity(idx, next);
//                         }}
//                         disabled={Number(item.quantity) <= minQty}
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
//                           const next = Number(tempValue) + 1;
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

//             <div className="promo-row">
//               <input type="text" placeholder="Promo code" />
//               <button>Apply</button>
//             </div>

//             <div className="summary-line">
//               <span>Sub-total</span>
//               <strong>₹{total.toFixed(2)}</strong>
//             </div>

//             <div className="summary-line">
//               <span>Voucher</span>
//               <strong>-</strong>
//             </div>

//             <div className="summary-line">
//               <span>Delivery Fee</span>
//               <strong>-</strong>
//             </div>

//             <hr />

//             <div className="summary-total">
//               <span>Total Amount</span>
//               <strong>₹{total.toFixed(2)}</strong>
//             </div>

//             <div className="mobile-none">
//               <button
//               className="summary-checkout"
//               onClick={() => router.push("/checkout")}
//             >
//               Continue to Pay
//             </button>
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
// <div className="mobile-cart-sticky desktop-none">
//   <button
//     className="mobile-cart-button"
//     onClick={() => router.push("/checkout")}
//   >
//    Continue to Pay  ₹{total.toFixed(2)}
//   </button>
// </div>

//       <ProductSlider />

//       <div className="container">
//         <DealBanner />
//         <FaqAccordion />
//       </div>
//       <Footer />
//     </div>
//   );
// }
