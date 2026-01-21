"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { toast } from "react-hot-toast";
import {
  FaBoxOpen,
  FaCalendarAlt,
  FaTruck,
  FaUser,
  FaCreditCard,
  FaMapMarkerAlt,
  FaFileInvoice,
} from "react-icons/fa";
import Offcanvas from "@/components/header/Offcanvas";

export default function OrderDetailPage() {
  const [reuploading, setReuploading] = useState(false);

  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const sendDispatchRequest = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `/api/orders/dispatch-request/${order._id}`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      toast.success("Dispatch request sent!");
      // reload page
      window.location.reload();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to send dispatch request",
      );
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        setOrder(res.data.order);
      } catch (err) {
        console.error("❌ Order fetch error:", err);
        toast.error("Failed to load order details");
        router.push("/orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, router]);

  // ✅ SAFE SUBTOTAL CALCULATION
  const calculatedSubtotal =
    typeof order?.subtotal === "number"
      ? order.subtotal
      : order?.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) ||
        order?.total ||
        0;

  // ✅ SAFE DISCOUNT CALCULATION
  const calculatedDiscount = order?.coupon?.discountAmount || 0;

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
        `}</style>
      </div>
    );

  if (!order)
    return (
      <div className="text-center py-5">
        <h5>Order not found</h5>
      </div>
    );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Delivered":
      case "Order Delivered":
        return "bg-success";
      case "Shipped":
      case "Order Dispatched":
        return "bg-info text-dark";
      case "Processing":
      case "In Progress":
        return "bg-warning text-dark";
      case "Cancelled":
      case "Design Rejected":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="order-details-area">
      <Topbar />
      <Offcanvas />

      <div className="container  padding-top-40">
        {/* HEADER */}
        <div className="card mb-4 p-4">
          <div className="d-flex justify-content-between gap-3 ">
            <div>
              <h4 className="fw-bold mb-2">
                <FaFileInvoice className="me-2 primary-c" />
                Order #{order.orderNumber || id.slice(-6)}
              </h4>
              <small className="text-muted">
                <FaCalendarAlt className="me-1" />
                {new Date(order.createdAt).toLocaleString()}
              </small>
            </div>

            <div className="top-buttons-area">
              <span
                className={`badge px-3 py-2 fs-6 ${getStatusBadgeClass(
                  order.status,
                )}`}
              >
                {order.status}
              </span>


                {["Pending", "Order Received", "In Packaging"].includes(
          order.status,
        ) && (
          <button
            className="badge px-3 py-2 fs-6 bg-danger border-0"
            onClick={async () => {
              if (!confirm("Are you sure you want to cancel this order?"))
                return;

              try {
                const token = localStorage.getItem("token");
                await axios.post(
                  `/api/orders/${order._id}/cancel`,
                  {},
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );

                toast.success("Order cancelled. Wallet refunded.");
                window.location.reload();
              } catch (err) {
                toast.error(err.response?.data?.message || "Cancel failed");
              }
            }}
          >
            Cancel Order
          </button>
        )}






              {/* ✔ If order is READY — show button */}
              {order.status === "Order Ready" &&
                order.dispatchRequest === "none" && (
                  <div className="mt-3">
                    <button
                      className="track-order-btn"
                      onClick={sendDispatchRequest}
                    >
                      Send Dispatch Request
                    </button>
                  </div>
                )}

              {/* ✔ When request sent but admin has not approved yet */}
              {order.status === "Order Ready" &&
                order.dispatchRequest === "pending" && (
                  <div className="alert alert-info mt-3">
                    Dispatch request sent. Waiting for admin approval.
                  </div>
                )}

              {/* ✔ When admin approves by marking "Order Dispatched" */}
              {order.dispatchRequest === "approved" && (
                <div className="alert alert-success mt-3">
                  Your dispatch request has been approved.
                </div>
              )}

              {/* 🚚 DELIVERY DETAILS (VISIBLE TO USER) */}
              {order.status === "Order Delivered" &&
                order.deliveryChallan?.fileUrl && (
                  <div className="mt-3 p-3 border rounded bg-light">
                    <h6 className="fw-semibold mb-2 text-success">
                      <FaTruck className="me-2" />
                      Order Delivered
                    </h6>

                    {/* Admin delivery remarks */}
                    {order.deliveryRemarks && (
                      <p className="mb-2">
                        <strong>Delivery Remarks:</strong>{" "}
                        {order.deliveryRemarks}
                      </p>
                    )}

                    {/* Delivery challan download */}
                    <a
                      href={order.deliveryChallan.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary btn-sm"
                    >
                      <FaFileInvoice className="me-2" />
                      Download Delivery Challan
                    </a>

                    {order.deliveredAt && (
                      <div className="text-muted small mt-2">
                        Delivered on:{" "}
                        {new Date(order.deliveredAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

              {/* ✅ Show rejection reason only when Design Rejected */}
              {order.status === "Design Rejected" && order.remarks && (
                <div className="mt-3 p-3 rounded border border-danger bg-light">
                  <h6 className="text-danger mb-1">
                    <FaBoxOpen className="me-2" />
                    Design Rejected
                  </h6>
                  <p className="mb-0">
                    <strong>Reason:</strong> {order.remarks}
                  </p>
                </div>
              )}

              {order.status === "Design Rejected" && (
                <div className="mt-3 p-3 border rounded">
                  <h6 className="fw-semibold mb-2">Re-upload Design</h6>

                  <input
                    type="file"
                    className="form-control mb-2"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append("file", file);

                      try {
                        setReuploading(true);
                        const token = localStorage.getItem("token");

                        await axios.post(
                          `/api/orders/reupload-design/${order._id}`,
                          formData,
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          },
                        );

                        toast.success("Design re-uploaded successfully");
                        window.location.reload();
                      } catch (err) {
                        toast.error("Failed to re-upload design");
                      } finally {
                        setReuploading(false);
                      }
                    }}
                    disabled={reuploading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/track-order/${order._id}`)}
          className="track-order-btn"
        >
          Track Your Order
        </button>

        {/* SHIPPING + BILLING INFO */}
        <div className="card mb-4 p-4">
          <div className="row">
            <div className="col-md-6 mb-3 customer-details">
              <h6 className="fw-semibold mb-2">
                <FaUser className="me-2 primary-c" />
                Customer Details
              </h6>
              <p className="mb-1">
                <strong>Name:</strong>{" "}
                {order.shipping?.name || order.user?.name}
              </p>
              <p className="mb-1">
                <strong>Company:</strong>{" "}
                {order.shipping?.companyName || order.user?.companyName || "—"}
              </p>
              <p className="mb-1">
                <strong>GST Number:</strong>{" "}
                {order.shipping?.gstNumber || order.user?.gstNumber || "—"}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {order.user?.email}
              </p>
              <p className="mb-1">
                <strong>Phone:</strong>{" "}
                {order.shipping?.phone || order.user?.phone}
              </p>
            </div>

            <div className="col-md-6 mb-3">
              <h6 className="fw-semibold mb-2">
                <FaMapMarkerAlt className="me-2 primary-c" />
                Shipping Address
              </h6>
              <p className="mb-1">{order.shipping?.street}</p>
              <p className="mb-1">
                {order.shipping?.city}, {order.shipping?.state} -{" "}
                {order.shipping?.zip}
              </p>
              <p className="mb-1">
                <strong>Payment Method:</strong>{" "}
                {order.paymentMethod || "Cash on Delivery"}
              </p>
            </div>
          </div>
        </div>

        {/* ORDER ITEMS */}
        <div className="card mb-4 p-4">
          <h6 className="fw-semibold mb-3">
            <FaBoxOpen className="me-2 primary-c" />
            Ordered Items
          </h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={item.product?.mainImage || "/no-image.png"}
                          alt={item.product?.name}
                          width={60}
                          height={60}
                          className="rounded me-3"
                          style={{ objectFit: "cover" }}
                        />
                        <div>
                          <div className="fw-semibold product-name-area">
                            {item.product?.name || "Unnamed Product"}
                          </div>
                          <div className="text-muted small">
                            ₹{item.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price.toFixed(2)}</td>
                    <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY */}
        {/* <div className="summary-card card p-3">
          <h6 className="fw-semibold mb-3">
            <FaCreditCard className="me-2 primary-c" />
            Payment Summary
          </h6>
          <div className="d-flex justify-content-end">
            <div style={{ minWidth: "260px" }}>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <strong>
                  ₹{order.subtotal || (order.total * 0.9).toFixed(2)}
                </strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <strong>₹{order.shippingCost || 0}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span className="fw-semibold">Total:</span>
                <strong className="primary-c fs-5">₹{order.total}</strong>
              </div>
            </div>
          </div>
        </div> */}

        <div className="summary-card card p-3">
          <h6 className="fw-semibold mb-3">Payment Summary</h6>

          <div className="d-flex justify-content-between mb-2">
            <span>Subtotal</span>
            <strong>₹{calculatedSubtotal.toFixed(2)}</strong>
          </div>

          {calculatedDiscount > 0 && (
            <div className="d-flex justify-content-between mb-2 text-success">
              <span>
                Discount {order?.coupon?.code ? `(${order.coupon.code})` : ""}
              </span>
              <strong>- ₹{calculatedDiscount.toFixed(2)}</strong>
            </div>
          )}

          <hr />

          <div className="d-flex justify-content-between">
            <span className="fw-semibold">Total Payable</span>
            <strong className="fs-5">₹{order.total.toFixed(2)}</strong>
          </div>
        </div>

        {/* BACK BUTTON */}
        <div className="text-center mt-4 mb-4">
          <button
            onClick={() => router.push("/orders")}
            className="view-orders-btn"
          >
            ← Back to My Orders
          </button>
        </div>

      
      </div>

      <Footer />
    </div>
  );
}
