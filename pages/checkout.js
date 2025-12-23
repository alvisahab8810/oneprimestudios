
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";
import Offcanvas from "@/components/header/Offcanvas";

export default function CheckoutPage() {

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);




  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
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

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

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
          zip: data.zip || "",
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

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const finalAmount = Math.max(total - discountAmount, 0);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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

    if (userType === "partner") {
      if (!companyName.trim())
        newErrors.companyName = "Company name is required for partners.";
      if (!gstNumber.trim())
        newErrors.gstNumber = "GST number is required for partners.";
    }

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
        body: JSON.stringify({ amount: finalAmount }),
      });

      const data = await res.json();
      if (!data?.id) throw new Error("Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: finalAmount * 100,

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
  // const placeOrder = async (method, paymentInfo = {}) => {
  //   if (!validateForm()) return;

  //   try {
  //     setSubmitting(true);
  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       alert("Please log in again.");
  //       return;
  //     }

  //     const res = await fetch("/api/orders/create", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify({
  //         address: formData,
  //         paymentMethod: method,
  //         paymentInfo,
  //         totalAmount: total,
  //         userType,
  //       }),
  //     });

  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.message || "Order failed");

  //     router.push(`/order-success?orderNumber=${data.orderNumber}`);
  //   } catch (err) {
  //     console.error("Order error:", err);
  //     alert(err.message || "Failed to place order.");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

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

      // Prepare payload matching backend fields
      const orderPayload = {
        items: cartItems.map((item) => ({
          product: item.product?._id || item.product,
          quantity: item.quantity,
          price: item.price,
            remarks: item.remarks || "", // ✅ THIS LINE IS REQUIRED
        })),
        subtotal: cartItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        shippingCharge: 0, // or your shipping logic
        // total: total,

        total: finalAmount,

        couponCode: appliedCoupon?.code || null,


        paymentMethod: method,
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

      // Redirect to success page
      router.push(`/order-success?orderNumber=${data.order.orderNumber}`);
    } catch (err) {
      console.error("Order error:", err);
      alert(err.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };




  // for the coupon 

  useEffect(() => {
  const storedCoupon = localStorage.getItem("appliedCoupon");
  if (storedCoupon) {
    try {
      const parsed = JSON.parse(storedCoupon);
      setAppliedCoupon(parsed);
      setDiscountAmount(parsed.discount || 0);
    } catch (e) {
      console.error("Invalid coupon data");
    }
  }
}, []);

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
            animation: cart-spin 1s linear infinite,
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

  return (
    <div className="checkout-area-page">
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
                      readOnly={!!prefilled.name}
                      style={
                        prefilled.name
                          ? {
                              backgroundColor: "#f5f5f5",
                              cursor: "not-allowed",
                            }
                          : {}
                      }
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
                      readOnly={!!prefilled.phone}
                      style={
                        prefilled.phone
                          ? {
                              backgroundColor: "#f5f5f5",
                              cursor: "not-allowed",
                            }
                          : {}
                      }
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
                    readOnly={!!prefilled.street}
                    style={
                      prefilled.street
                        ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
                        : {}
                    }
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
                      readOnly={!!prefilled.city}
                      style={
                        prefilled.city
                          ? {
                              backgroundColor: "#f5f5f5",
                              cursor: "not-allowed",
                            }
                          : {}
                      }
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
                      readOnly={!!prefilled.state}
                      style={
                        prefilled.state
                          ? {
                              backgroundColor: "#f5f5f5",
                              cursor: "not-allowed",
                            }
                          : {}
                      }
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
                      readOnly={!!prefilled.zip}
                      style={
                        prefilled.zip
                          ? {
                              backgroundColor: "#f5f5f5",
                              cursor: "not-allowed",
                            }
                          : {}
                      }
                    />
                    {errors.zip && (
                      <div className="invalid-feedback">{errors.zip}</div>
                    )}
                  </div>
                </div>

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
                        GST Number *
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

                {/* <div className="d-flex justify-content-between mt-3 border-top pt-2">
                  <strong>Total</strong>
                  <strong>₹{total}</strong>
                </div> */}


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

<div className="d-flex justify-content-between border-top pt-2 fw-bold">
  <span>Amount Payable</span>
  <span>₹{finalAmount.toFixed(2)}</span>
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
                  className="place-order-btn mt-4"
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

      <div className="container mb-5">
        <DealBanner />
      </div>
      <Footer />
    </div>
  );
}
