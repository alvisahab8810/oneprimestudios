// "use client";

// import Script from "next/script";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import DealBanner from "@/components/home-page/Cta";
// import Offcanvas from "@/components/header/Offcanvas";
// import { toast } from "react-hot-toast";
// export default function CheckoutPage() {
//   const [appliedCoupon, setAppliedCoupon] = useState(null);
//   const [discountAmount, setDiscountAmount] = useState(0);
//   const [walletBalance, setWalletBalance] = useState(null);

//   const [cartItems, setCartItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   // const [paymentMethod, setPaymentMethod] = useState("cod");
//   const [paymentMethod, setPaymentMethod] = useState("");

//   const [userType, setUserType] = useState("");
//   const router = useRouter();

//   const [formData, setFormData] = useState({
//     name: "",
//     phone: "",
//     street: "",
//     city: "",
//     state: "",
//     zip: "",
//     companyName: "",
//     gstNumber: "",
//   });

//   // ✅ New: track which fields came from backend (prefilled)
//   const [prefilled, setPrefilled] = useState({});
//   const [errors, setErrors] = useState({});

//   const getImageUrl = (imgPath) => {
//     if (!imgPath) return "/no-image.png";
//     if (/^https?:\/\//.test(imgPath)) return imgPath;
//     if (typeof window !== "undefined")
//       return `${window.location.origin}${imgPath}`;
//     return imgPath;
//   };

//   useEffect(() => {
//     const fetchWallet = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await fetch("/api/partner/wallet", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const data = await res.json();
//         setWalletBalance(data.balance || 0);
//       } catch {
//         setWalletBalance(0);
//       }
//     };
//     fetchWallet();
//   }, []);

//   // 🧾 Fetch User Info
//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }

//         const res = await fetch("/api/user/me", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data.message || "Failed to load user");

//         setUserType(data.userType || "customer");

//         // ✅ Prefill form and mark which fields are prefilled from DB
//         const newForm = {
//           name: data.name || "",
//           phone: data.phone || "",
//           street: data.businessAddress || "",
//           city: data.city || "",
//           state: data.state || "",
//           // zip: data.zip || "",
//           zip: data.pinCode || "",
//           companyName: data.companyName || "",
//           gstNumber: data.gstNumber || "",
//         };

//         setFormData(newForm);

//         const prefilledMap = {};
//         Object.keys(newForm).forEach((key) => {
//           if (newForm[key]) prefilledMap[key] = true;
//         });
//         setPrefilled(prefilledMap);
//       } catch (err) {
//         console.error("User fetch error:", err);
//       }
//     };

//     fetchUser();
//   }, [router]);


//   useEffect(() => {
//   if (userType === "partner") {
//     setPaymentMethod("wallet");
//   }

//   if (userType === "customer") {
//     setPaymentMethod("razorpay");
//   }
// }, [userType]);



// useEffect(() => {
//   if (userType === "partner") {
//     setPaymentMethod("wallet");
//   } else if (userType === "customer") {
//     setPaymentMethod("razorpay");
//   }
// }, [userType]);


//   // 🛒 Load Cart
//   useEffect(() => {
//     const loadCart = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/login");
//           return;
//         }

//         const res = await fetch("/api/cart", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!res.ok) throw new Error("Failed to load cart");
//         const data = await res.json();
//         setCartItems(data || []);
//       } catch (err) {
//         console.error("Cart fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadCart();
//   }, [router]);

//   const total = cartItems.reduce(
//     (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
//     0,
//   );

//   const finalAmount = Math.max(total - discountAmount, 0);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//     setErrors({ ...errors, [name]: "" });
//   };

//   // ✅ Inline Validation
//   const validateForm = () => {
//     let newErrors = {};
//     const { name, phone, street, city, state, zip, companyName, gstNumber } =
//       formData;

//     if (!name.trim()) newErrors.name = "Full name is required.";
//     else if (!/^[A-Za-z\s]+$/.test(name))
//       newErrors.name = "Name can only contain letters.";

//     if (!phone.trim()) newErrors.phone = "Phone number is required.";
//     else if (!/^[6-9]\d{9}$/.test(phone))
//       newErrors.phone = "Phone number must be 10 digits.";

//     if (!street.trim()) newErrors.street = "Street address is required.";
//     else if (street.length < 5)
//       newErrors.street = "Street address seems too short.";

//     if (!city.trim()) newErrors.city = "City is required.";
//     if (!state.trim()) newErrors.state = "State is required.";

//     if (!zip.trim()) newErrors.zip = "ZIP Code is required.";
//     else if (!/^\d{6}$/.test(zip)) newErrors.zip = "ZIP must be 6 digits.";

//     if (userType === "partner") {
//       if (!companyName.trim()) {
//         newErrors.companyName = "Company name is required for partners.";
//       }

//       // ✅ GST validation ONLY if user entered it
//       if (gstNumber && !/^[0-9A-Z]{15}$/.test(gstNumber)) {
//         newErrors.gstNumber = "Invalid GST number format.";
//       }
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   // 💳 Razorpay Payment
//   const handleRazorpayPayment = async () => {
//     if (!validateForm()) return;

//     try {
//       setSubmitting(true);
//       const res = await fetch("/api/payment/razorpay-order", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ amount: finalAmount }),
//       });

//       const data = await res.json();
//       if (!data?.id) throw new Error("Failed to create Razorpay order");

//       const options = {
//         key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
//         amount: finalAmount * 100,

//         currency: "INR",
//         name: "One Prime Studios",
//         description: "Order Payment",
//         order_id: data.id,
//         handler: async (response) => {
//           await placeOrder("Razorpay", response);
//         },
//         prefill: {
//           name: formData.name,
//           contact: formData.phone,
//         },
//         theme: { color: "#0d6efd" },
//       };

//       const razor = new window.Razorpay(options);
//       razor.open();
//     } catch (err) {
//       console.error("Razorpay error:", err);
//       alert("Payment failed. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

// const placeOrder = async (method) => {
//   if (submitting) return; // 🔒 HARD STOP
//   if (!validateForm()) return;

//   try {
//     setSubmitting(true);
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Please log in again.");
//       return;
//     }

//     const orderPayload = {
//       items: cartItems.map((item) => ({
//         product: item.product?._id || item.product,
//         quantity: item.quantity,
//         price: item.price,
//         remarks: item.remarks || "",
//       })),
//       subtotal: cartItems.reduce(
//         (sum, item) => sum + item.price * item.quantity,
//         0
//       ),
//       total: finalAmount,
//       couponCode: appliedCoupon?.code || null,
//       paymentMethod: method,
//     };

//     const res = await fetch("/api/orders/create", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(orderPayload),
//     });

//     const data = await res.json();
//     if (!res.ok) throw new Error(data.message || "Order failed");

//     // ✅ Clear coupon
//     localStorage.removeItem("appliedCoupon");

//     // ✅ Clear cart
//     await fetch("/api/cart/clear", {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     // ✅ Update wallet balance locally (ONCE)
//     if (method === "Wallet") {
//       setWalletBalance((prev) => Math.max(prev - finalAmount, 0));
//     }

//     // ✅ Redirect ONCE
//     router.push(`/order-success?orderNumber=${data.order.orderNumber}`);

//   } catch (err) {
//     console.error("Order error:", err);

//     if (
//       method === "Wallet" &&
//       err.message?.toLowerCase().includes("insufficient")
//     ) {
//       toast.error("Insufficient wallet balance. Please add money.");
//       router.push("/partner/wallet/add");
//       return;
//     }

//     toast.error(err.message || "Failed to place order.");
//   } finally {
//     setSubmitting(false);
//   }
// };

//   // for the coupon

//   useEffect(() => {
//     const storedCoupon = localStorage.getItem("appliedCoupon");
//     if (storedCoupon) {
//       try {
//         const parsed = JSON.parse(storedCoupon);
//         setAppliedCoupon(parsed);
//         setDiscountAmount(parsed.discount || 0);
//       } catch (e) {
//         console.error("Invalid coupon data");
//       }
//     }
//   }, []);

//   if (loading)
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

//   return (
//     <div className="checkout-area-page">
//       <Script
//       src="https://checkout.razorpay.com/v1/checkout.js"
//       strategy="afterInteractive"
//     />

//       <Topbar />
//       <Offcanvas />

//       <div className="container padding-top-40 padding-b-50">
//         {/* <h2 className="mb-4 fw-bold text-center">Checkout</h2> */}

//         {cartItems.length === 0 ? (
//           <p className="text-center">Your cart is empty.</p>
//         ) : (
//           <div className="row g-4">
//             {/* Shipping Details */}
//             <div className="col-md-8">
//               <div className="card p-4 ">
//                 <h4 className="mb-3 fw-semibold">Shipping Details</h4>

//                 {/* Name & Phone */}
//                 <div className="row">
//                   <div className="col-md-6 mb-3">
//                     <label className="form-label fw-semibold">
//                       Full Name *
//                     </label>
//                     <input
//                       className={`form-control ${
//                         errors.name ? "is-invalid" : ""
//                       }`}
//                       name="name"
//                       value={formData.name}
//                       onChange={handleChange}
//                       placeholder="Enter full name"
//                       readOnly={!!prefilled.name}
//                       style={
//                         prefilled.name
//                           ? {
//                               backgroundColor: "#f5f5f5",
//                               cursor: "not-allowed",
//                             }
//                           : {}
//                       }
//                     />
//                     {errors.name && (
//                       <div className="invalid-feedback">{errors.name}</div>
//                     )}
//                   </div>

//                   <div className="col-md-6 mb-3">
//                     <label className="form-label fw-semibold">Phone *</label>
//                     <input
//                       className={`form-control ${
//                         errors.phone ? "is-invalid" : ""
//                       }`}
//                       name="phone"
//                       value={formData.phone}
//                       onChange={handleChange}
//                       placeholder="10-digit mobile number"
//                       maxLength={10}
//                       readOnly={!!prefilled.phone}
//                       style={
//                         prefilled.phone
//                           ? {
//                               backgroundColor: "#f5f5f5",
//                               cursor: "not-allowed",
//                             }
//                           : {}
//                       }
//                     />
//                     {errors.phone && (
//                       <div className="invalid-feedback">{errors.phone}</div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Street */}
//                 <div className="mb-3">
//                   <label className="form-label fw-semibold">Street *</label>
//                   <input
//                     className={`form-control ${
//                       errors.street ? "is-invalid" : ""
//                     }`}
//                     name="street"
//                     value={formData.street}
//                     onChange={handleChange}
//                     placeholder="House number, street, etc."
//                     readOnly={!!prefilled.street}
//                     style={
//                       prefilled.street
//                         ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
//                         : {}
//                     }
//                   />
//                   {errors.street && (
//                     <div className="invalid-feedback">{errors.street}</div>
//                   )}
//                 </div>

//                 {/* City, State, ZIP */}
//                 <div className="row">
//                   <div className="col-md-4 mb-3">
//                     <label className="form-label fw-semibold">City *</label>
//                     <input
//                       className={`form-control ${
//                         errors.city ? "is-invalid" : ""
//                       }`}
//                       name="city"
//                       value={formData.city}
//                       onChange={handleChange}
//                       readOnly={!!prefilled.city}
//                       style={
//                         prefilled.city
//                           ? {
//                               backgroundColor: "#f5f5f5",
//                               cursor: "not-allowed",
//                             }
//                           : {}
//                       }
//                     />
//                     {errors.city && (
//                       <div className="invalid-feedback">{errors.city}</div>
//                     )}
//                   </div>

//                   <div className="col-md-4 mb-3">
//                     <label className="form-label fw-semibold">State *</label>
//                     <input
//                       className={`form-control ${
//                         errors.state ? "is-invalid" : ""
//                       }`}
//                       name="state"
//                       value={formData.state}
//                       onChange={handleChange}
//                       readOnly={!!prefilled.state}
//                       style={
//                         prefilled.state
//                           ? {
//                               backgroundColor: "#f5f5f5",
//                               cursor: "not-allowed",
//                             }
//                           : {}
//                       }
//                     />
//                     {errors.state && (
//                       <div className="invalid-feedback">{errors.state}</div>
//                     )}
//                   </div>

//                   <div className="col-md-4 mb-3">
//                     <label className="form-label fw-semibold">Pin Code *</label>
//                     <input
//                       className={`form-control ${
//                         errors.zip ? "is-invalid" : ""
//                       }`}
//                       name="zip"
//                       value={formData.zip}
//                       onChange={handleChange}
//                       maxLength={6}
//                       readOnly={!!prefilled.zip}
//                       style={
//                         prefilled.zip
//                           ? {
//                               backgroundColor: "#f5f5f5",
//                               cursor: "not-allowed",
//                             }
//                           : {}
//                       }
//                     />
//                     {errors.zip && (
//                       <div className="invalid-feedback">{errors.zip}</div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Partner-only fields */}
//                 {userType === "partner" && (
//                   <>
//                     <hr />
//                     <h4 className="fw-semibold mb-3 ">
//                       Partner Business Details
//                     </h4>

//                     <div className="mb-3">
//                       <label className="form-label fw-semibold">
//                         Company Name *
//                       </label>
//                       <input
//                         className={`form-control ${
//                           errors.companyName ? "is-invalid" : ""
//                         }`}
//                         name="companyName"
//                         value={formData.companyName}
//                         onChange={handleChange}
//                         placeholder="Enter company name"
//                         readOnly={!!prefilled.companyName}
//                         style={
//                           prefilled.companyName
//                             ? {
//                                 backgroundColor: "#f5f5f5",
//                                 cursor: "not-allowed",
//                               }
//                             : {}
//                         }
//                       />
//                       {errors.companyName && (
//                         <div className="invalid-feedback">
//                           {errors.companyName}
//                         </div>
//                       )}
//                     </div>

//                     <div className="mb-3">
//                       <label className="form-label fw-semibold">
//                         GST Number (Optional)
//                       </label>
//                       <input
//                         className={`form-control ${
//                           errors.gstNumber ? "is-invalid" : ""
//                         }`}
//                         name="gstNumber"
//                         value={formData.gstNumber}
//                         onChange={handleChange}
//                         placeholder="Enter GST number"
//                         readOnly={!!prefilled.gstNumber}
//                         style={
//                           prefilled.gstNumber
//                             ? {
//                                 backgroundColor: "#f5f5f5",
//                                 cursor: "not-allowed",
//                               }
//                             : {}
//                         }
//                       />
//                       {errors.gstNumber && (
//                         <div className="invalid-feedback">
//                           {errors.gstNumber}
//                         </div>
//                       )}
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>

//             {/* Order Summary */}
//             <div className="col-md-4">
//               <div className="card p-4">
//                 <h4 className="mb-3 fw-semibold">Order Summary</h4>
//                 {cartItems.map((item, idx) => (
//                   <div
//                     key={idx}
//                     className="d-flex align-items-center border-bottom py-3 mob-padding"
//                   >
//                     <img
//                       src={getImageUrl(item.product?.mainImage)}
//                       alt={item.product?.name || "Product"}
//                       width={80}
//                       height={80}
//                       className="rounded border me-3"
//                       style={{ objectFit: "cover" }}
//                       onError={(e) => (e.currentTarget.src = "/no-image.png")}
//                     />
//                     <div>
//                       <h6 className="mb-1 fw-semibold">{item.product?.name}</h6>
//                       <p className="mb-0 text-muted small">
//                         Qty: {item.quantity} × ₹{item.price} = ₹
//                         {(item.quantity * item.price).toFixed(2)}
//                       </p>
//                     </div>
//                   </div>
//                 ))}

//                 <div className="d-flex justify-content-between mt-3">
//                   <span>Subtotal</span>
//                   <span>₹{total.toFixed(2)}</span>
//                 </div>

//                 {appliedCoupon && (
//                   <div className="d-flex justify-content-between text-success">
//                     <span>Coupon ({appliedCoupon.code})</span>
//                     <span>- ₹{discountAmount.toFixed(2)}</span>
//                   </div>
//                 )}

//                 <div className="d-flex justify-content-between border-top pt-2 fw-bold">
//                   <span>Amount Payable</span>
//                   <span>₹{finalAmount.toFixed(2)}</span>
//                 </div>

//                 {/* <div className="mt-3">
//                   <label className="form-label fw-semibold mb-2">
//                     Select Payment Method
//                   </label>
//                   <select
//                     className="form-select"
//                     value={paymentMethod}
//                     onChange={(e) => setPaymentMethod(e.target.value)}
//                   >
//                     <option value="cod">Cash on Delivery</option>
//                     <option value="razorpay">Pay Online (Razorpay)</option>
//                   </select>
//                 </div> */}
//               {userType === "partner" && walletBalance !== null && (
//   <div className="alert alert-light">
//     Wallet Balance: ₹{walletBalance.toFixed(2)}
//   </div>
// )}

//                 {/* <select
//                   className="form-select"
//                   value={paymentMethod}
//                   onChange={(e) => setPaymentMethod(e.target.value)}
//                 >
//                   <option value="cod">Cash on Delivery</option>

//                   <option
//                     value="wallet"
//                     disabled={
//                       walletBalance !== null && walletBalance < finalAmount
//                     }
//                   >
//                     Pay using Wallet
//                     {walletBalance !== null && walletBalance < finalAmount
//                       ? " (Insufficient balance)"
//                       : ""}
//                   </option>
//                 </select> */}


//                 {/* <select
//   className="form-select"
//   value={paymentMethod}
//   onChange={(e) => setPaymentMethod(e.target.value)}
// >
//   {userType === "partner" && (
//     <option
//       value="wallet"
//       disabled={walletBalance < finalAmount}
//     >
//       Pay using Wallet
//       {walletBalance < finalAmount ? " (Insufficient balance)" : ""}
//     </option>
//   )}

//   {userType === "customer" && (
//     <option value="razorpay">Pay Online (Razorpay)</option>
//   )}
// </select> */}


//                 <button
//   className="place-order-btn mt-4"
//   disabled={submitting}
//   onClick={() => {
//     if (submitting) return; // 🔒 double-click protection
//     if (!validateForm()) return;

//     if (cartItems.length === 0) {
//       toast.error("Your cart is empty.");
//       return;
//     }

//     // 🔐 PAYMENT ROUTING
//     if (paymentMethod === "wallet") {
//       placeOrder("Wallet");
//     } else if (paymentMethod === "razorpay") {
//       handleRazorpayPayment();
//     } else {
//       toast.error("Please select a payment method");
//     }
//   }}
// >
//   {submitting
//     ? "Processing..."
//     : paymentMethod === "wallet"
//     ? "Pay Using Wallet"
//     : paymentMethod === "razorpay"
//     ? "Pay Online"
//     : "Select Payment Method"}
// </button>

//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       <div className="container mb-5">
//         <DealBanner />
//       </div>
//       <Footer />
//     </div>
//   );
// }















"use client";

import Link from "next/link";
import Script from "next/script";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";
import Offcanvas from "@/components/header/Offcanvas";
import { toast } from "react-hot-toast";
import { cartAllowsCod } from "@/lib/codRules";
import { isValidGstin, gstinError, normalizeGstin } from "@/lib/gstin";
export default function CheckoutPage() {
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  // Courier rate for the entered pincode: { serviceable, charge, courierName, etd, message }
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [userType, setUserType] = useState("");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    companyName: "",
    gstNumber: "",
  });

  // ✅ New: track which fields came from backend (prefilled)
  const [prefilled, setPrefilled] = useState({});
  const [errors, setErrors] = useState({});

  // Every address the shopper has saved, and the one this order ships to.
  // Picking one here does not change their default on the account.
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // A saved address is shown locked so it is not changed by accident. Retail
  // shoppers can unlock it for this order, and keep the change on their account.
  const [editAddress, setEditAddress] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);

  // Only a retail account's address is editable here; a partner's doubles as
  // the billing address on their GST invoice and is changed from the profile.
  const canEditAddress = userType === "customer";
  const addressFieldsLocked = (field) =>
    !!prefilled[field] && !(canEditAddress && editAddress);
  const lockedStyle = (field) =>
    addressFieldsLocked(field)
      ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
      : {};

  // The saved address is only worth offering to edit once there is one
  const hasSavedAddress = ["street", "city", "state", "zip"].some(
    (f) => !!prefilled[f]
  );

  // Writes the address on screen back to the shopper's account, so the next
  // order starts from it. A failure here must not stop the order going through.
  const persistAddress = async () => {
    if (!canEditAddress || !editAddress || !saveAddress) return;

    try {
      const token = localStorage.getItem("token");
      const body = {
        label: "Home",
        name: formData.name,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pinCode: formData.zip,
      };

      // An edited address updates the entry it came from; a brand new one is
      // added to the book rather than overwriting whatever was selected
      const res = await fetch(
        selectedAddressId
          ? `/api/user/addresses/${selectedAddressId}`
          : "/api/user/addresses",
        {
          method: selectedAddressId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Address save skipped:", data.message || res.status);
      }
    } catch (err) {
      console.error("Address save skipped:", err.message);
    }
  };

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/partner/wallet", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setWalletBalance(data.balance || 0);
      } catch {
        setWalletBalance(0);
      }
    };
    fetchWallet();
  }, []);

  // 🧾 Fetch User Info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load user");

        setUserType(data.userType || "customer");

        // ✅ Prefill form and mark which fields are prefilled from DB
        const newForm = {
          name: data.name || "",
          phone: data.phone || "",
          street: data.businessAddress || "",
          city: data.city || "",
          state: data.state || "",
          zip: data.pinCode || "",
          companyName: data.companyName || "",
          gstNumber: data.gstNumber || "",
        };

        setFormData(newForm);

        const prefilledMap = {};
        Object.keys(newForm).forEach((key) => {
          if (newForm[key]) prefilledMap[key] = true;
        });
        setPrefilled(prefilledMap);
      } catch (err) {
        console.error("User fetch error:", err);
      }
    };

    fetchUser();
  }, [router]);

  // Fills the shipping form from a saved address, and marks those fields as
  // coming from the account so they stay locked until "Edit address" is used
  const applyAddress = (address) => {
    if (!address) return;

    setSelectedAddressId(String(address._id || ""));
    setFormData((prev) => ({
      ...prev,
      name: address.name || "",
      phone: address.phone || "",
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      zip: address.pinCode || "",
    }));
    setPrefilled((prev) => ({
      ...prev,
      name: !!address.name,
      phone: !!address.phone,
      street: !!address.street,
      city: !!address.city,
      state: !!address.state,
      zip: !!address.pinCode,
    }));
    setErrors({});
    setEditAddress(false);
  };

  // Starts a one-off address. It is added to the book only if the shopper
  // leaves "save this address" ticked when the order goes through.
  const startNewAddress = () => {
    setSelectedAddressId("");
    setFormData((prev) => ({
      ...prev,
      name: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
    }));
    setPrefilled((prev) => ({
      ...prev,
      name: false,
      phone: false,
      street: false,
      city: false,
      state: false,
      zip: false,
    }));
    setErrors({});
    setEditAddress(true);
  };

  // Retail shoppers keep an address book; a partner has the one address on
  // their profile, which the form is already prefilled from
  useEffect(() => {
    if (userType !== "customer") return;

    const loadAddresses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/user/addresses", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json();
        if (!res.ok) return;

        const list = data.addresses || [];
        setSavedAddresses(list);

        const chosen = list.find((a) => a.isDefault) || list[0];
        if (chosen) applyAddress(chosen);
      } catch (err) {
        console.error("Address book skipped:", err.message);
      }
    };

    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);


  useEffect(() => {
  if (userType === "partner") {
    setPaymentMethod("wallet");
  }

  if (userType === "customer") {
    setPaymentMethod("razorpay");
  }
}, [userType]);




  // Retail buyers buying for a business can ask for the invoice in the firm's
  // name; left off, nothing changes for an ordinary shopper
  const [wantsGstInvoice, setWantsGstInvoice] = useState(false);

  // Once the business details are in, the card shows them as a line with a
  // "Change" link instead of keeping two input boxes open
  const [gstEditing, setGstEditing] = useState(false);

  const gstDetailsReady =
    formData.companyName.trim().length > 1 && isValidGstin(formData.gstNumber);

  // Every retail product offers cash on delivery unless an admin turned it off
  // for that product; the server checks this again before placing the order
  const codAllowed = userType === "customer" && cartAllowsCod(cartItems);

  // A cart that loses its last COD item must not keep COD selected
  useEffect(() => {
    if (paymentMethod === "cod" && !codAllowed) setPaymentMethod("razorpay");
  }, [codAllowed, paymentMethod]);

  // 🛒 Load Cart
  useEffect(() => {
    const loadCart = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load cart");
        const data = await res.json();
        setCartItems(data || []);
      } catch (err) {
        console.error("Cart fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [router]);

  // 🚚 Transport charge — the courier's own rate for this pincode.
  // Partners (B2B) are not charged for transport, so no quote is fetched for them.
  useEffect(() => {
    const zip = String(formData.zip || "").trim();

    if (userType === "partner" || !/^\d{6}$/.test(zip) || cartItems.length === 0) {
      setShippingQuote(null);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/shipping/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ zip }),
        });
        const data = await res.json();
        if (cancelled) return;
        setShippingQuote(
          res.ok
            ? data
            : { serviceable: false, charge: 0, message: data.message || "Delivery charges could not be calculated." }
        );
      } catch (err) {
        console.error("Shipping estimate error:", err);
        if (!cancelled) {
          setShippingQuote({
            serviceable: false,
            charge: 0,
            message: "Delivery charges could not be calculated. Please try again.",
          });
        }
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.zip, cartItems, userType]);

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  const gstAmount = cartItems.reduce((acc, item) => {
    const gstPct = Number(item.product?.gstPercent || 0);
    return acc + (Number(item.price || 0) * Number(item.quantity || 1) * gstPct / 100);
  }, 0);

  const discountedSubtotal = Math.max(total - discountAmount, 0);
  // Transport is charged to customers (B2C) only — partner orders ship free
  const transportApplies = userType !== "partner";
  const transportCharge =
    transportApplies && shippingQuote?.serviceable ? Number(shippingQuote.charge) || 0 : 0;
  const finalAmount = discountedSubtotal + gstAmount + transportCharge;

  // Nothing can be ordered until the courier has priced this delivery
  const shippingReady = !transportApplies || (!!shippingQuote?.serviceable && !shippingLoading);

  // A partner pays from the wallet by default. When the balance cannot cover
  // this order the selection moves to online payment, and an explicit choice of
  // online payment is left alone.
  useEffect(() => {
    if (userType !== "partner" || walletBalance === null) return;
    setPaymentMethod((prev) =>
      prev === "razorpay" ? prev : walletBalance >= finalAmount ? "wallet" : "razorpay"
    );
  }, [userType, walletBalance, finalAmount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = name === "gstNumber" ? normalizeGstin(value).slice(0, 15) : value;
    setFormData({ ...formData, [name]: clean });
    setErrors({ ...errors, [name]: "" });
  };

  // ✅ Inline Validation
  const validateForm = () => {
    let newErrors = {};
    const { name, phone, street, city, state, zip, companyName, gstNumber } =
      formData;

    if (!name.trim()) newErrors.name = "Full name is required.";
    else if (!/^[A-Za-z\s]+$/.test(name))
      newErrors.name = "Name can only contain letters.";

    if (!phone.trim()) newErrors.phone = "Phone number is required.";
    else if (!/^[6-9]\d{9}$/.test(phone))
      newErrors.phone = "Phone number must be 10 digits.";

    if (!street.trim()) newErrors.street = "Street address is required.";
    else if (street.length < 5)
      newErrors.street = "Street address seems too short.";

    if (!city.trim()) newErrors.city = "City is required.";
    if (!state.trim()) newErrors.state = "State is required.";

    if (!zip.trim()) newErrors.zip = "ZIP Code is required.";
    else if (!/^\d{6}$/.test(zip)) newErrors.zip = "ZIP must be 6 digits.";

    // Asked for only when the retail buyer ticks the GST invoice box
    if (userType === "customer" && wantsGstInvoice) {
      if (!companyName.trim()) {
        newErrors.companyName = "Business name is required for a GST invoice.";
      }
      const gstProblem = gstinError(gstNumber);
      if (gstProblem) newErrors.gstNumber = gstProblem;
    }

    if (userType === "partner") {
      if (!companyName.trim()) {
        newErrors.companyName = "Company name is required for partners.";
      }

      // A partner may leave it blank, but a typed one has to be real
      if (gstNumber.trim() && !isValidGstin(gstNumber)) {
        newErrors.gstNumber = gstinError(gstNumber);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💳 Razorpay Payment
  // Blocks checkout while the delivery charge is unknown, and says why
  const checkShippingReady = () => {
    if (!transportApplies) return true;
    if (shippingLoading) {
      toast.error("Please wait, calculating delivery charges.");
      return false;
    }
    if (!shippingQuote) {
      toast.error("Please enter a valid 6-digit pincode to continue.");
      return false;
    }
    if (!shippingQuote.serviceable) {
      toast.error(shippingQuote.message || "Delivery is not available for this pincode.");
      return false;
    }
    return true;
  };

  const handleRazorpayPayment = async () => {
    if (!validateForm()) return;
    if (!checkShippingReady()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payment/razorpay-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: finalAmount }),
      });

      const data = await res.json();
      if (!data?.id) throw new Error(data?.message || "Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: finalAmount * 100,

        currency: "INR",
        name: "One Prime Studios",
        description: "Order Payment",
        order_id: data.id,
        handler: async (response) => {
          // These three are what the server verifies the payment against
          await placeOrder("Razorpay", {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          // The customer closed the modal without paying — let them try again
          ondismiss: () => setSubmitting(false),
        },
        prefill: {
          name: formData.name,
          contact: formData.phone,
        },
        theme: { color: "#0d6efd" },
      };

      const razor = new window.Razorpay(options);
      razor.on("payment.failed", (resp) => {
        setSubmitting(false);
        toast.error(resp?.error?.description || "Payment failed. Please try again.");
      });
      razor.open();
    } catch (err) {
      console.error("Razorpay error:", err);
      setSubmitting(false);
      toast.error(err.message || "Payment could not be started. Please try again.");
    }
  };

const placeOrder = async (method, payment = null) => {
  // Razorpay lands here from inside the modal, where submitting is already true
  if (submitting && method !== "Razorpay") return; // 🔒 HARD STOP
  if (!validateForm()) return;
  if (!checkShippingReady()) return;

  // Keeps an edited address on the account before the order is written
  await persistAddress();

  try {
    setSubmitting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in again.");
      return;
    }

    const orderPayload = {
  items: cartItems.map((item) => ({
  product: item.product?._id || item.product,
  quantity: item.quantity,
  price: item.price,
  remarks: item.remarks || "",
  // OLD: selectedAttrs was missing — so Size, GSM etc. were lost at checkout
  // NEW: include selectedAttrs so it flows into the order
  selectedAttrs: item.selectedAttrs || {},
  uploadedFiles: item.uploadedFiles || [],
  uploadedAttributeFiles: item.uploadedAttributeFiles || [],

})),

      subtotal: cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
      gstAmount,
      total: finalAmount,
      couponCode: appliedCoupon?.code || null,
      paymentMethod: method,
      orderName: cartItems[0]?.orderName || "",
      // Sent only when the buyer asked for a GST invoice
      gstDetails:
        userType === "customer" && wantsGstInvoice
          ? {
              gstin: formData.gstNumber.trim().toUpperCase(),
              businessName: formData.companyName.trim(),
            }
          : null,
      ...(payment || {}),
      shippingAddress: {
        street: formData.street,
        city:   formData.city,
        state:  formData.state,
        zip:    formData.zip,
      },
    };

    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Order failed");

    // ✅ Clear coupon
    localStorage.removeItem("appliedCoupon");

    // ✅ Clear cart
    await fetch("/api/cart/clear", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    // ✅ Update wallet balance locally (ONCE)
    if (method === "Wallet") {
      setWalletBalance((prev) => Math.max(prev - finalAmount, 0));
    }

    // ✅ Redirect ONCE
    router.push(`/order-success?orderNumber=${data.order.orderNumber}`);

  } catch (err) {
    console.error("Order error:", err);

    if (
      method === "Wallet" &&
      err.message?.toLowerCase().includes("insufficient")
    ) {
      toast.error("Insufficient wallet balance. Please add money.");
      router.push("/partner/wallet/add");
      return;
    }

    toast.error(err.message || "Failed to place order.");
  } finally {
    setSubmitting(false);
  }
};

  // for the coupon

  // The coupon was applied on the cart, which may have changed since. It is
  // re-checked against this order's subtotal, so one that no longer qualifies
  // (a minimum order, an expiry) is dropped here with the reason, instead of
  // being shown as a discount and then refused at Place Order.
  useEffect(() => {
    if (loading || cartItems.length === 0) return;

    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem("appliedCoupon") || "null");
    } catch {
      stored = null;
    }

    if (!stored?.code) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/coupons/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code: stored.code, cartTotal: total }),
        });

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data.success) {
          // The discount is recalculated too, so a percentage coupon never
          // carries over an amount worked out on a bigger cart
          const next = { code: data.coupon.code, discount: data.discount };
          setAppliedCoupon(next);
          setDiscountAmount(next.discount || 0);
          localStorage.setItem("appliedCoupon", JSON.stringify(next));
          return;
        }

        // A server error is not the buyer's fault — only a refusal removes it
        if (res.status >= 500) return;

        setAppliedCoupon(null);
        setDiscountAmount(0);
        localStorage.removeItem("appliedCoupon");
        toast.error(
          `${stored.code} removed — ${data.message || "this coupon cannot be used for this order"}`
        );
      } catch (err) {
        // Offline or a dropped request: leave the coupon as it is, the order
        // route checks it again before anything is charged
        console.error("Coupon re-check failed:", err);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [loading, cartItems.length, total]);

  if (loading)
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
        .co-addr {
          margin-bottom: 20px;
        }
        .co-addr-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 9px;
        }
        .co-addr-t {
          font-size: 12.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
        }
        .co-addr-manage {
          font-size: 12.5px;
          font-weight: 600;
          color: #111111;
          text-decoration: underline;
          text-underline-offset: 3px;
          white-space: nowrap;
        }
        .co-addr-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 10px;
        }
        .co-addr-card {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          padding: 12px;
          margin: 0;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .co-addr-card:hover {
          border-color: #c9cdd3;
        }
        .co-addr-card-on {
          border-color: #111111;
          box-shadow: inset 0 0 0 1px #111111;
        }
        .co-addr-radio {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          accent-color: #111111;
          flex: none;
        }
        .co-addr-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .co-addr-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .co-addr-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #111111;
        }
        .co-addr-tag {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f3f4f6;
          color: #4b5563;
          border-radius: 4px;
          padding: 2px 6px;
        }
        .co-addr-lines {
          font-size: 12.5px;
          color: #4b5563;
          line-height: 1.5;
        }
        .co-addr-phone {
          font-size: 12px;
          color: #6b7280;
        }
        .co-addr-new {
          border: 1px dashed #c9cdd3;
          border-radius: 10px;
          background: #fafbfc;
          color: #111111;
          font-size: 13px;
          font-weight: 600;
          padding: 12px;
          min-height: 74px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .co-addr-new:hover {
          border-color: #111111;
          background: #f6f7f9;
        }
        @media (max-width: 575px) {
          .co-addr-list {
            grid-template-columns: 1fr;
          }
        }
        `}</style>
      </div>
    );

  return (
    <div className="checkout-area-page">
      <Script
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
    />

      <Topbar />
      <Offcanvas />

      <div className="container padding-top-40 padding-b-50">
        {/* <h2 className="mb-4 fw-bold text-center">Checkout</h2> */}

        {cartItems.length === 0 ? (
          <p className="text-center">Your cart is empty.</p>
        ) : (
          <div className="row g-4">
            {/* Shipping Details */}
            <div className="col-md-8">
              <div className="card p-4 ">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h4 className="mb-0 fw-semibold">Shipping Details</h4>

                  {canEditAddress && hasSavedAddress && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditAddress((v) => !v)}
                    >
                      {editAddress ? "Done editing" : "Edit address"}
                    </button>
                  )}
                </div>

                {/* Saved addresses, picked the way any shopping app does it.
                    Partners have a single profile address, so they see none. */}
                {canEditAddress && savedAddresses.length > 0 && (
                  <div className="co-addr">
                    <div className="co-addr-head">
                      <span className="co-addr-t">Deliver this order to</span>
                      <Link href="/address" className="co-addr-manage">
                        Manage addresses
                      </Link>
                    </div>

                    <div className="co-addr-list">
                      {savedAddresses.map((address) => {
                        const id = String(address._id);
                        const on = id === selectedAddressId;

                        return (
                          <label
                            key={id}
                            className={`co-addr-card${on ? " co-addr-card-on" : ""}`}
                          >
                            <input
                              type="radio"
                              name="checkoutAddress"
                              className="co-addr-radio"
                              checked={on}
                              onChange={() => applyAddress(address)}
                            />
                            <span className="co-addr-body">
                              <span className="co-addr-row">
                                <span className="co-addr-name">{address.name}</span>
                                <span className="co-addr-tag">{address.label || "Home"}</span>
                              </span>
                              <span className="co-addr-lines">
                                {address.street}, {address.city}, {address.state}{" "}
                                {address.pinCode}
                              </span>
                              <span className="co-addr-phone">{address.phone}</span>
                            </span>
                          </label>
                        );
                      })}

                      <button
                        type="button"
                        className={`co-addr-new${
                          selectedAddressId ? "" : " co-addr-card-on"
                        }`}
                        onClick={startNewAddress}
                      >
                        + Deliver to a new address
                      </button>
                    </div>
                  </div>
                )}

                {/* Name & Phone */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Full Name *
                    </label>
                    <input
                      className={`form-control ${
                        errors.name ? "is-invalid" : ""
                      }`}
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      readOnly={addressFieldsLocked("name")}
                      style={lockedStyle("name")}
                    />
                    {errors.name && (
                      <div className="invalid-feedback">{errors.name}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Phone *</label>
                    <input
                      className={`form-control ${
                        errors.phone ? "is-invalid" : ""
                      }`}
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      readOnly={addressFieldsLocked("phone")}
                      style={lockedStyle("phone")}
                    />
                    {errors.phone && (
                      <div className="invalid-feedback">{errors.phone}</div>
                    )}
                  </div>
                </div>

                {/* Street */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Street *</label>
                  <input
                    className={`form-control ${
                      errors.street ? "is-invalid" : ""
                    }`}
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="House number, street, etc."
                    readOnly={addressFieldsLocked("street")}
                    style={lockedStyle("street")}
                  />
                  {errors.street && (
                    <div className="invalid-feedback">{errors.street}</div>
                  )}
                </div>

                {/* City, State, ZIP */}
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">City *</label>
                    <input
                      className={`form-control ${
                        errors.city ? "is-invalid" : ""
                      }`}
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      readOnly={addressFieldsLocked("city")}
                      style={lockedStyle("city")}
                    />
                    {errors.city && (
                      <div className="invalid-feedback">{errors.city}</div>
                    )}
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">State *</label>
                    <input
                      className={`form-control ${
                        errors.state ? "is-invalid" : ""
                      }`}
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      readOnly={addressFieldsLocked("state")}
                      style={lockedStyle("state")}
                    />
                    {errors.state && (
                      <div className="invalid-feedback">{errors.state}</div>
                    )}
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Pin Code *</label>
                    <input
                      className={`form-control ${
                        errors.zip ? "is-invalid" : ""
                      }`}
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      maxLength={6}
                      readOnly={addressFieldsLocked("zip")}
                      style={lockedStyle("zip")}
                    />
                    {errors.zip && (
                      <div className="invalid-feedback">{errors.zip}</div>
                    )}
                  </div>
                </div>

                {/* Keeping the address, so the next order starts from it */}
                {canEditAddress && editAddress && (
                  <label className="d-flex align-items-start gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    <span style={{ fontSize: 13 }}>
                      {selectedAddressId
                        ? "Save these changes to my address book"
                        : "Save this address to my address book for future orders"}
                    </span>
                  </label>
                )}

                {canEditAddress && (
                  <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                    You can also change your address any time from{" "}
                    <Link href="/address">My Address</Link>.
                  </p>
                )}

                {/* Retail buyers who need the bill in a business name */}
                {userType === "customer" && (
                  <div
                    className={`gst-card mt-3${wantsGstInvoice ? " is-on" : ""}`}
                  >
                    <label className="gst-card-head">
                      <input
                        type="checkbox"
                        className="gst-check"
                        checked={wantsGstInvoice}
                        onChange={(e) => {
                          setWantsGstInvoice(e.target.checked);
                          if (e.target.checked) setGstEditing(!gstDetailsReady);
                        }}
                      />
                      <span className="gst-head-text">
                        <span className="gst-title">Get GST invoice for this order</span>
                        <span className="gst-sub">
                          Buying for a business? Get the bill in your company&apos;s name
                          and claim input tax credit.
                        </span>
                      </span>
                      <span className="gst-art" aria-hidden="true">
                        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
                          <rect
                            x="9"
                            y="5"
                            width="26"
                            height="34"
                            rx="3"
                            fill="#eef3ff"
                            stroke="#1A71F6"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M15 14h14M15 20h14M15 26h9"
                            stroke="#1A71F6"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                          <circle cx="34" cy="33" r="9" fill="#1A71F6" />
                          <path
                            d="m30.5 33.2 2.6 2.6 4.6-5"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </label>

                    {wantsGstInvoice &&
                      !gstEditing &&
                      gstDetailsReady &&
                      !errors.companyName &&
                      !errors.gstNumber && (
                      <div className="gst-saved">
                        <div>
                          <div className="gst-saved-name">
                            {formData.companyName.trim()}
                          </div>
                          <div className="gst-saved-gstin">
                            GSTIN: {formData.gstNumber.trim().toUpperCase()}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="gst-change"
                          onClick={() => setGstEditing(true)}
                        >
                          Change
                        </button>
                      </div>
                    )}

                    {wantsGstInvoice &&
                      (gstEditing ||
                        !gstDetailsReady ||
                        errors.companyName ||
                        errors.gstNumber) && (
                      <div className="gst-fields">
                        <div className="gst-field">
                          <label className="gst-label">Business name</label>
                          <input
                            className={`form-control ${errors.companyName ? "is-invalid" : ""}`}
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleChange}
                            placeholder="Name as registered under GST"
                          />
                          {errors.companyName && (
                            <div className="invalid-feedback">{errors.companyName}</div>
                          )}
                        </div>

                        <div className="gst-field">
                          <label className="gst-label">GSTIN</label>
                          <input
                            className={`form-control gst-gstin ${
                              errors.gstNumber ? "is-invalid" : ""
                            }`}
                            name="gstNumber"
                            value={formData.gstNumber}
                            onChange={handleChange}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                          />
                          {errors.gstNumber && (
                            <div className="invalid-feedback">{errors.gstNumber}</div>
                          )}
                        </div>

                        <div className="gst-actions">
                          <button
                            type="button"
                            className="gst-save"
                            disabled={!gstDetailsReady}
                            onClick={() => setGstEditing(false)}
                          >
                            Save details
                          </button>
                          <span className="gst-hint">
                            15 characters, exactly as on your GST certificate.
                          </span>
                        </div>
                      </div>
                    )}

                    <style jsx global>{`
                      .gst-card {
                        border: 1px solid #e5e7eb;
                        border-radius: 14px;
                        background: #fff;
                        overflow: hidden;
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                      }

                      .gst-card.is-on {
                        border-color: #1a71f6;
                        box-shadow: 0 0 0 3px rgba(26, 113, 246, 0.08);
                      }

                      .gst-card-head {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        margin: 0;
                        padding: 16px 18px;
                        cursor: pointer;
                      }

                      .gst-check {
                        width: 18px;
                        height: 18px;
                        margin-top: 2px;
                        flex: 0 0 auto;
                        accent-color: #1a71f6;
                        cursor: pointer;
                      }

                      .gst-head-text {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        flex: 1 1 auto;
                        min-width: 0;
                      }

                      .gst-title {
                        font-size: 15px;
                        font-weight: 700;
                        color: #111827;
                        line-height: 1.3;
                      }

                      .gst-sub {
                        font-size: 12.5px;
                        color: #6b7280;
                        line-height: 1.45;
                      }

                      .gst-art {
                        flex: 0 0 auto;
                        line-height: 0;
                      }

                      .gst-saved {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        margin: 0 18px 16px;
                        padding: 12px 14px;
                        background: #f6f9ff;
                        border: 1px solid #dbe7fd;
                        border-radius: 10px;
                      }

                      .gst-saved-name {
                        font-size: 14px;
                        font-weight: 700;
                        color: #111827;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                      }

                      .gst-saved-gstin {
                        font-size: 12.5px;
                        color: #4b5563;
                        margin-top: 2px;
                        letter-spacing: 0.4px;
                      }

                      .gst-change {
                        border: 0;
                        background: none;
                        color: #1a71f6;
                        font-size: 13.5px;
                        font-weight: 700;
                        padding: 0;
                        cursor: pointer;
                        white-space: nowrap;
                      }

                      .gst-fields {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 14px 16px;
                        padding: 0 18px 18px;
                        border-top: 1px solid #f1f2f4;
                        padding-top: 16px;
                      }

                      .gst-field {
                        min-width: 0;
                      }

                      .gst-label {
                        display: block;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 0.3px;
                        text-transform: uppercase;
                        color: #6b7280;
                        margin-bottom: 6px;
                      }

                      .gst-fields .form-control {
                        height: 44px;
                        border-radius: 10px;
                        border-color: #e5e7eb;
                        font-size: 14px;
                      }

                      .gst-fields .form-control:focus {
                        border-color: #1a71f6;
                        box-shadow: 0 0 0 3px rgba(26, 113, 246, 0.12);
                      }

                      .gst-gstin {
                        text-transform: uppercase;
                        letter-spacing: 1px;
                      }

                      .gst-actions {
                        grid-column: 1 / -1;
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        flex-wrap: wrap;
                      }

                      .gst-save {
                        border: 0;
                        border-radius: 8px;
                        background: #1a71f6;
                        color: #fff;
                        font-size: 13.5px;
                        font-weight: 700;
                        padding: 9px 20px;
                        cursor: pointer;
                      }

                      .gst-save:disabled {
                        background: #c7d7f5;
                        cursor: not-allowed;
                      }

                      .gst-hint {
                        font-size: 12px;
                        color: #9ca3af;
                      }

                      @media (max-width: 575.98px) {
                        .gst-card-head {
                          padding: 14px;
                          gap: 10px;
                        }

                        .gst-art svg {
                          width: 36px;
                          height: 36px;
                        }

                        .gst-fields {
                          grid-template-columns: 1fr;
                          padding: 14px 14px 16px;
                        }

                        .gst-saved {
                          margin: 0 14px 14px;
                        }
                      }
                    `}</style>
                  </div>
                )}

                {/* Partner-only fields */}
                {userType === "partner" && (
                  <>
                    <hr />
                    <h4 className="fw-semibold mb-3 ">
                      Partner Business Details
                    </h4>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Company Name *
                      </label>
                      <input
                        className={`form-control ${
                          errors.companyName ? "is-invalid" : ""
                        }`}
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="Enter company name"
                        readOnly={!!prefilled.companyName}
                        style={
                          prefilled.companyName
                            ? {
                                backgroundColor: "#f5f5f5",
                                cursor: "not-allowed",
                              }
                            : {}
                        }
                      />
                      {errors.companyName && (
                        <div className="invalid-feedback">
                          {errors.companyName}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        GST Number (Optional)
                      </label>
                      <input
                        className={`form-control ${
                          errors.gstNumber ? "is-invalid" : ""
                        }`}
                        name="gstNumber"
                        value={formData.gstNumber}
                        onChange={handleChange}
                        placeholder="Enter GST number"
                        readOnly={!!prefilled.gstNumber}
                        style={
                          prefilled.gstNumber
                            ? {
                                backgroundColor: "#f5f5f5",
                                cursor: "not-allowed",
                              }
                            : {}
                        }
                      />
                      {errors.gstNumber && (
                        <div className="invalid-feedback">
                          {errors.gstNumber}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="col-md-4">
              <div className="card p-4">
                <h4 className="mb-3 fw-semibold">Order Summary</h4>
                {cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="d-flex align-items-center border-bottom py-3 mob-padding"
                  >
                    <img
                      src={getImageUrl(item.product?.mainImage)}
                      alt={item.product?.name || "Product"}
                      width={80}
                      height={80}
                      className="rounded border me-3"
                      style={{ objectFit: "cover" }}
                      onError={(e) => (e.currentTarget.src = "/no-image.png")}
                    />
                    <div>
                      <h6 className="mb-1 fw-semibold">{item.product?.name}</h6>
                      <p className="mb-0 text-muted small">
                        Qty: {item.quantity} × ₹{item.price} = ₹
                        {(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="d-flex justify-content-between mt-3">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="d-flex justify-content-between text-success">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {gstAmount > 0 && (
                  <div className="d-flex justify-content-between" style={{ fontSize: 13, color: "#6b7280" }}>
                    <span>GST</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Transport charge — exactly what the courier charges for this pincode.
                    Partner orders are not charged, so the row is hidden for them. */}
                {transportApplies && (
                <div className="d-flex justify-content-between" style={{ fontSize: 13, color: "#6b7280" }}>
                  <span>
                    Transport Charge
                    {shippingQuote?.serviceable && shippingQuote.courierName ? (
                      <span className="d-block" style={{ fontSize: 11 }}>
                        via {shippingQuote.courierName}
                        {shippingQuote.etd ? ` · ${shippingQuote.etd}` : ""}
                      </span>
                    ) : null}
                  </span>
                  <span>
                    {shippingLoading
                      ? "Calculating..."
                      : shippingQuote?.freeDelivery
                        ? <span style={{ color: "#1d7044", fontWeight: 600 }}>FREE</span>
                        : shippingQuote?.serviceable
                          ? `₹${transportCharge.toFixed(2)}`
                          : "—"}
                  </span>
                </div>
                )}

                {transportApplies && !shippingLoading && shippingQuote && !shippingQuote.serviceable && (
                  <div className="alert alert-warning py-2 px-3 mt-2 mb-0" style={{ fontSize: 13 }}>
                    {shippingQuote.message || "Delivery is not available for this pincode."}
                  </div>
                )}

                <div className="d-flex justify-content-between border-top pt-2 fw-bold">
                  <span>Amount Payable</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>

                {/* <div className="mt-3">
                  <label className="form-label fw-semibold mb-2">
                    Select Payment Method
                  </label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="razorpay">Pay Online (Razorpay)</option>
                  </select>
                </div> */}
              {userType === "partner" && walletBalance !== null && (
  <div className="alert alert-light">
    Wallet Balance: ₹{walletBalance.toFixed(2)}
  </div>
)}

                {/* A partner pays from the wallet, or online when it is short */}
                {userType === "partner" && (
                  <div className="mt-3">
                    <label className="form-label fw-semibold mb-2">Payment Method</label>
                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option
                        value="wallet"
                        disabled={walletBalance !== null && walletBalance < finalAmount}
                      >
                        {walletBalance !== null && walletBalance < finalAmount
                          ? "Pay using Wallet (insufficient balance)"
                          : "Pay using Wallet"}
                      </option>
                      <option value="razorpay">Pay Online (UPI, Card, Net Banking)</option>
                    </select>

                    {paymentMethod === "wallet" && walletBalance !== null && (
                      <p className="mb-0 mt-2" style={{ fontSize: 12.5, color: "#6b7280" }}>
                        ₹{finalAmount.toFixed(2)} will be deducted from your wallet. Balance after
                        this order: ₹{Math.max(walletBalance - finalAmount, 0).toFixed(2)}.
                      </p>
                    )}

                    {walletBalance !== null && walletBalance < finalAmount && (
                      <p className="mb-0 mt-2" style={{ fontSize: 12.5, color: "#92400e" }}>
                        Your wallet has ₹{walletBalance.toFixed(2)} — ₹
                        {(finalAmount - walletBalance).toFixed(2)} short for this order. Pay online
                        now, or <Link href="/partner/wallet/add">add money to your wallet</Link>.
                      </p>
                    )}
                  </div>
                )}

                {/* <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cod">Cash on Delivery</option>

                  <option
                    value="wallet"
                    disabled={
                      walletBalance !== null && walletBalance < finalAmount
                    }
                  >
                    Pay using Wallet
                    {walletBalance !== null && walletBalance < finalAmount
                      ? " (Insufficient balance)"
                      : ""}
                  </option>
                </select> */}


                {/* <select
  className="form-select"
  value={paymentMethod}
  onChange={(e) => setPaymentMethod(e.target.value)}
>
  {userType === "partner" && (
    <option
      value="wallet"
      disabled={walletBalance < finalAmount}
    >
      Pay using Wallet
      {walletBalance < finalAmount ? " (Insufficient balance)" : ""}
    </option>
  )}

  {userType === "customer" && (
    <option value="razorpay">Pay Online (Razorpay)</option>
  )}
</select> */}


                {userType === "customer" && codAllowed && (
                  <div className="mt-3">
                    <label className="form-label fw-semibold mb-2">Payment Method</label>
                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="razorpay">Pay Online</option>
                      <option value="cod">Cash on Delivery</option>
                    </select>
                    {paymentMethod === "cod" && (
                      <p className="mb-0 mt-2" style={{ fontSize: 12.5, color: "#6b7280" }}>
                        Pay ₹{finalAmount.toFixed(2)} to the delivery agent when your order arrives.
                      </p>
                    )}
                  </div>
                )}

                <button
  className="place-order-btn mt-4"
  disabled={submitting || !shippingReady}
  onClick={() => {
    if (submitting) return; // 🔒 double-click protection
    if (!validateForm()) return;

    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (!checkShippingReady()) return;

    // 🔐 PAYMENT ROUTING
    if (paymentMethod === "wallet") {
      placeOrder("Wallet");
    } else if (paymentMethod === "cod") {
      placeOrder("COD");
    } else if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    } else {
      toast.error("Please select a payment method");
    }
  }}
>
  {submitting
    ? "Processing..."
    : transportApplies && shippingLoading
    ? "Calculating delivery..."
    : paymentMethod === "wallet"
    ? "Pay Using Wallet"
    : paymentMethod === "cod"
    ? "Place Order (Cash on Delivery)"
    : paymentMethod === "razorpay"
    ? "Pay Online"
    : "Select Payment Method"}
</button>

              </div>
            </div>
          </div>
        )}
      </div>

      <div className="container mb-5">
        <DealBanner />
      </div>
      <Footer />
    </div>
  );
}













