// "use client";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";
// import { useRouter } from "next/navigation";

// export default function CheckoutPage() {
//   const [cartItems, setCartItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState("cod");
//   const router = useRouter();

//   const [formData, setFormData] = useState({
//     name: "",
//     phone: "",
//     street: "",
//     city: "",
//     state: "",
//     zip: "",
//   });

//   const getImageUrl = (imgPath) => {
//     if (!imgPath) return "/no-image.png";
//     if (/^https?:\/\//.test(imgPath)) return imgPath;
//     if (typeof window !== "undefined")
//       return `${window.location.origin}${imgPath}`;
//     return imgPath;
//   };

//   // 🛒 Load cart
//   useEffect(() => {
//     const loadCart = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Please log in to continue.");
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
//         toast.error("Failed to load cart. Please log in again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadCart();
//   }, [router]);

//   const total = cartItems.reduce(
//     (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
//     0
//   );

//   const handleChange = (e) =>
//     setFormData({ ...formData, [e.target.name]: e.target.value });

//   const validateForm = () => {
//     const { name, phone, street, city, state, zip } = formData;
//     if (!name || !phone || !street || !city || !state || !zip) {
//       toast.error("⚠️ Please fill out all shipping details.");
//       return false;
//     }
//     if (!/^[6-9]\d{9}$/.test(phone)) {
//       toast.error("📱 Invalid phone number. It must be 10 digits.");
//       return false;
//     }
//     if (zip.length < 5) {
//       toast.error("📬 Invalid ZIP code.");
//       return false;
//     }
//     return true;
//   };

//   // 💰 Razorpay Payment
//   const handleRazorpayPayment = async () => {
//     try {
//       setSubmitting(true);

//       const res = await fetch("/api/payment/razorpay-order", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ amount: total }),
//       });
//       const data = await res.json();

//       if (!data?.id) throw new Error("Failed to create Razorpay order");

//       const options = {
//         key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
//         amount: total * 100,
//         currency: "INR",
//         name: "Viralon Store",
//         description: "Order Payment",
//         order_id: data.id,
//         handler: async (response) => {
//           toast.success("✅ Payment successful!");
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
//       toast.error("Payment failed. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 📦 Place Order (works for both COD + Razorpay)
//   const placeOrder = async (method, paymentInfo = {}) => {
//     try {
//       setSubmitting(true);
//       const token = localStorage.getItem("token");
//       if (!token) {
//         toast.error("Please log in again.");
//         return;
//       }

//       const res = await fetch("/api/orders/create", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           address: formData, // <-- backend expects `address`
//           paymentMethod: method, // <-- backend expects `paymentMethod`
//           paymentInfo, // optional additional info
//           totalAmount: total, // <-- backend expects `totalAmount`
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message || "Order failed");

//       toast.success("🎉 Order placed successfully!");
//       // router.push(`/order-success?orderId=${data.order?._id || data._id}`);
//       router.push(`/order-success?orderNumber=${data.orderNumber}`);
//     } catch (err) {
//       console.error("Order error:", err);
//       toast.error(err.message || "Failed to place order.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading)
//     return <div className="text-center my-5">Loading your cart...</div>;

//   return (
//     <div className="container my-5">
//       <h2 className="mb-4 fw-bold text-center">🛍️ Checkout</h2>

//       {cartItems.length === 0 ? (
//         <p className="text-center">Your cart is empty.</p>
//       ) : (
//         <div className="row g-4">
//           {/* Shipping Details */}
//           <div className="col-md-8">
//             <div className="card shadow-sm p-4 border-0">
//               <h4 className="mb-3 fw-semibold">Shipping Details</h4>
//               <div className="row">
//                 <div className="col-md-6 mb-3">
//                   <label className="form-label fw-semibold">Full Name</label>
//                   <input
//                     className="form-control"
//                     name="name"
//                     value={formData.name}
//                     onChange={handleChange}
//                   />
//                 </div>
//                 <div className="col-md-6 mb-3">
//                   <label className="form-label fw-semibold">Phone</label>
//                   <input
//                     className="form-control"
//                     name="phone"
//                     value={formData.phone}
//                     onChange={handleChange}
//                   />
//                 </div>
//               </div>
//               <div className="mb-3">
//                 <label className="form-label fw-semibold">Street</label>
//                 <input
//                   className="form-control"
//                   name="street"
//                   value={formData.street}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="row">
//                 <div className="col-md-4 mb-3">
//                   <label className="form-label fw-semibold">City</label>
//                   <input
//                     className="form-control"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                   />
//                 </div>
//                 <div className="col-md-4 mb-3">
//                   <label className="form-label fw-semibold">State</label>
//                   <input
//                     className="form-control"
//                     name="state"
//                     value={formData.state}
//                     onChange={handleChange}
//                   />
//                 </div>
//                 <div className="col-md-4 mb-3">
//                   <label className="form-label fw-semibold">ZIP</label>
//                   <input
//                     className="form-control"
//                     name="zip"
//                     value={formData.zip}
//                     onChange={handleChange}
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Order Summary */}
//           <div className="col-md-4">
//             <div className="card shadow-sm p-4 border-0">
//               <h4 className="mb-3 fw-semibold">Order Summary</h4>

//               {cartItems.map((item, idx) => (
//                 <div
//                   key={idx}
//                   className="d-flex align-items-center border-bottom py-3"
//                 >
//                   <img
//                     src={getImageUrl(item.product?.mainImage)}
//                     alt={item.product?.name || "Product"}
//                     width={80}
//                     height={80}
//                     className="rounded border me-3"
//                     style={{ objectFit: "cover" }}
//                     onError={(e) => (e.currentTarget.src = "/no-image.png")}
//                   />
//                   <div>
//                     <h6 className="mb-1 fw-semibold">{item.product?.name}</h6>
//                     <p className="mb-0 text-muted small">
//                       Qty: {item.quantity} × ₹{item.price} = ₹
//                       {(item.quantity * item.price).toFixed(2)}
//                     </p>
//                   </div>
//                 </div>
//               ))}

//               <div className="d-flex justify-content-between mt-3 border-top pt-2">
//                 <strong>Total</strong>
//                 <strong>₹{total}</strong>
//               </div>

//               <div className="mt-3">
//                 <label className="form-label fw-semibold mb-2">
//                   Select Payment Method
//                 </label>
//                 <select
//                   className="form-select"
//                   value={paymentMethod}
//                   onChange={(e) => setPaymentMethod(e.target.value)}
//                 >
//                   <option value="cod">Cash on Delivery</option>
//                   <option value="razorpay">Pay Online (Razorpay)</option>
//                 </select>
//               </div>
//               <button
//                 className="btn btn-success w-100 mt-4"
//                 onClick={() => {
//                   if (!validateForm()) return;
//                   if (cartItems.length === 0) {
//                     toast.error("Your cart is empty.");
//                     return;
//                   }

//                   if (paymentMethod === "razorpay") {
//                     handleRazorpayPayment();
//                   } else {
//                     placeOrder("Cash on Delivery");
//                   }
//                 }}
//                 disabled={submitting}
//               >
//                 {submitting
//                   ? "Processing..."
//                   : paymentMethod === "cod"
//                   ? "Place Order (Cash on Delivery)"
//                   : "Pay Now (Razorpay)"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const [errors, setErrors] = useState({});

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

  // 🛒 Load cart
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

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" }); // clear error on typing
  };

  // ✅ Inline Validation
  const validateForm = () => {
    let newErrors = {};
    const { name, phone, street, city, state, zip } = formData;

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💳 Razorpay Payment
  const handleRazorpayPayment = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/payment/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      const data = await res.json();
      if (!data?.id) throw new Error("Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: total * 100,
        currency: "INR",
        name: "SS Coaching",
        description: "Order Payment",
        order_id: data.id,
        handler: async (response) => {
          await placeOrder("Razorpay", response);
        },
        prefill: {
          name: formData.name,
          contact: formData.phone,
        },
        theme: { color: "#0d6efd" },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error("Razorpay error:", err);
      alert("Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 📦 Place Order
  const placeOrder = async (method, paymentInfo = {}) => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in again.");
        return;
      }

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: formData,
          paymentMethod: method,
          paymentInfo,
          totalAmount: total,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order failed");

      router.push(`/order-success?orderNumber=${data.orderNumber}`);
    } catch (err) {
      console.error("Order error:", err);
      alert(err.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <div className="text-center my-5">Loading your cart...</div>;

  return (
    <>
      <div className="container">
        <Topbar />
      </div>
      <div className="container my-5">
        <h2 className="mb-4 fw-bold text-center">🛍️ Checkout</h2>

        {cartItems.length === 0 ? (
          <p className="text-center">Your cart is empty.</p>
        ) : (
          <div className="row g-4">
            {/* Shipping Details */}
            <div className="col-md-8">
              <div className="card shadow-sm p-4 border-0">
                <h4 className="mb-3 fw-semibold">Shipping Details</h4>

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
                    />
                    {errors.zip && (
                      <div className="invalid-feedback">{errors.zip}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="col-md-4">
              <div className="card shadow-sm p-4 border-0">
                <h4 className="mb-3 fw-semibold">Order Summary</h4>
                {cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="d-flex align-items-center border-bottom py-3"
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

                <div className="d-flex justify-content-between mt-3 border-top pt-2">
                  <strong>Total</strong>
                  <strong>₹{total}</strong>
                </div>

                <div className="mt-3">
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
                </div>

                <button
                  className="btn btn-success w-100 mt-4"
                  onClick={() => {
                    if (!validateForm()) return;
                    if (cartItems.length === 0)
                      return alert("Your cart is empty.");

                    paymentMethod === "razorpay"
                      ? handleRazorpayPayment()
                      : placeOrder("Cash on Delivery");
                  }}
                  disabled={submitting}
                >
                  {submitting
                    ? "Processing..."
                    : paymentMethod === "cod"
                    ? "Place Order (Cash on Delivery)"
                    : "Pay Now (Razorpay)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

       <div className="container  mb-5">
        <DealBanner/>
       </div>
      <Footer />
    </>
  );
}
