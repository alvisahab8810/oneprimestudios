// pages/cart.js
"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [tempQty, setTempQty] = useState({}); // { [index]: "123" } - string for free typing
  const [removingIndex, setRemovingIndex] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        { headers: { Authorization: `Bearer ${token}` } }
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

    const minQty = item.product?.minOrderQty ?? 1;
    const raw = tempQty[index];

    if (!raw || raw.trim() === "") {
      toast.error(
        `You cannot enter less than the minimum quantity (${minQty}).`
      );
      setTempQty((prev) => ({ ...prev, [index]: String(minQty) }));

      // Wait briefly so toast shows before re-render
      setTimeout(() => updateQuantity(index, minQty), 800);
      return;
    }

    const numeric = Number(raw);
    if (isNaN(numeric) || numeric < minQty) {
      toast.error(
        `You cannot enter less than the minimum quantity (${minQty}).`
      );
      setTempQty((prev) => ({ ...prev, [index]: String(minQty) }));

      // Wait briefly so toast shows before re-render
      setTimeout(() => updateQuantity(index, minQty), 800);
      return;
    }

    // valid: update server if value changed
    if (numeric !== Number(item.quantity)) {
      updateQuantity(index, numeric);
    } else {
      // keep temp in sync (in case)
      setTempQty((prev) => ({ ...prev, [index]: String(numeric) }));
    }
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

  const getImageUrl = (imgPath) => {
    if (!imgPath) return "/no-image.png";
    if (/^https?:\/\//.test(imgPath)) return imgPath;
    if (typeof window !== "undefined")
      return `${window.location.origin}${imgPath}`;
    return imgPath;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-50">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{
            height: "100vh",
            background: "rgba(255, 255, 255, 0.8)",
            flexDirection: "column",
          }}
        >
          <div
            className="spinner-border text-primary mb-3"
            style={{
              width: "4rem",
              height: "4rem",
              borderWidth: "6px",
              animation: "spinPulse 1.2s ease-in-out infinite",
            }}
            role="status"
          ></div>
          <h5 className="fw-semibold text-secondary">Loading your cart...</h5>

          <style jsx>{`
            @keyframes spinPulse {
              0% {
                transform: rotate(0deg) scale(1);
              }
              50% {
                transform: rotate(180deg) scale(1.15);
              }
              100% {
                transform: rotate(360deg) scale(1);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <>
        <div className="container">
          <Topbar />
        </div>

        <div className="container pt5-100">
          <div
            className="d-flex flex-column justify-content-center align-items-center p-5 border rounded-4 bg-light shadow-sm"
            style={{
              minHeight: "60vh",
              background: "linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)",
            }}
          >
            <img
              src="/assets/images/cart.gif"
              alt="Empty Cart"
              className="mb-4"
              style={{ width: "150px", opacity: 0.8 }}
            />

            <h3 className="fw-bold mb-2 text-dark">Your Cart is Empty</h3>
            <p className="text-muted mb-4" style={{ maxWidth: "400px" }}>
              Looks like you haven’t added anything yet. Your designs will still
              be available in <strong>My Projects</strong>.
            </p>

            <Link
              href="/products"
              className="btn btn-primary px-4 py-2 rounded-pill shadow-sm"
            >
              <i className="bi bi-arrow-left me-2"></i> Continue Shopping
            </Link>
          </div>
        </div>

        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="container">
        <Topbar />
      </div>

      <div className="container pt5-100">
        <h2 className="mb-4 fw-bold">Your Cart</h2>

        <div className="table-responsive">
          <table className="table align-middle table-bordered shadow-sm">
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th style={{ width: 180 }}>Quantity</th>
                <th>Price</th>
                <th>Attributes</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {cartItems.map((item, idx) => {
                const minQty = item.product?.minOrderQty ?? 1;
                const qtyDisplay =
                  Number(item.quantity) < minQty
                    ? minQty
                    : Number(item.quantity);
                const tempValue =
                  tempQty[idx] !== undefined
                    ? tempQty[idx]
                    : String(qtyDisplay);
                const unitPrice = Number(item.price || 0);
                const subtotal =
                  unitPrice * Number(item.quantity || qtyDisplay);

                return (
                  <tr key={String(item.product?._id || idx)}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={getImageUrl(item.product?.mainImage)}
                          alt={item.product?.name || "Product"}
                          width={70}
                          height={70}
                          className="rounded me-3 border"
                          style={{ objectFit: "cover" }}
                          onError={(e) =>
                            (e.currentTarget.src = "/no-image.png")
                          }
                        />
                        <div>
                          <strong>
                            {item.product?.name || "Unnamed product"}
                          </strong>
                          <div className="text-muted small">
                            ₹{unitPrice.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="input-group input-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            // decrement: compute new numeric candidate and validate against min
                            const current = Number(
                              tempValue || item.quantity || minQty
                            );
                            const next = current - 1;
                            if (next < minQty) {
                              toast.error(
                                `You cannot enter less than the minimum quantity (${minQty}).`
                              );
                              setTempQty((prev) => ({
                                ...prev,
                                [idx]: String(minQty),
                              }));
                              setTimeout(
                                () => updateQuantity(idx, minQty),
                                800
                              );
                              return;
                            }

                            // update local temp so typing isn't blocked
                            setTempQty((prev) => ({
                              ...prev,
                              [idx]: String(next),
                            }));
                            updateQuantity(idx, next);
                          }}
                          disabled={Number(item.quantity) <= minQty}
                        >
                          −
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control text-center"
                          value={tempValue}
                          onChange={(e) =>
                            handleQtyInputChange(idx, e.target.value)
                          }
                          onBlur={() => handleQtyBlur(idx)}
                          onKeyDown={(e) => handleQtyKeyDown(e, idx)}
                          aria-label={`Quantity for ${
                            item.product?.name ?? "product"
                          }`}
                        />

                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            const current = Number(
                              tempValue || item.quantity || minQty
                            );
                            const next = current + 1;
                            setTempQty((prev) => ({
                              ...prev,
                              [idx]: String(next),
                            }));
                            updateQuantity(idx, next);
                          }}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-muted small mt-1">Min: {minQty}</div>
                    </td>

                    <td>₹{subtotal.toFixed(2)}</td>

                    <td>
                      {item.selectedAttrs &&
                      Object.keys(item.selectedAttrs).length ? (
                        Object.entries(item.selectedAttrs).map(([k, v]) => (
                          <div key={k}>
                            <small>
                              <strong>{k}:</strong>{" "}
                              {Array.isArray(v) ? v.join(", ") : v}
                            </small>
                          </div>
                        ))
                      ) : (
                        <small className="text-muted">—</small>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmRemove(idx)}
                        disabled={removingIndex === idx}
                      >
                        {removingIndex === idx ? (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                          />
                        ) : (
                          "Remove"
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <h4 className="fw-bold">Total: ₹{total.toFixed(2)}</h4>
          <div>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={() => router.push("/products")}
            >
              Continue Shopping
            </button>
            <button
              className="btn btn-primary px-4"
              onClick={() => router.push("/checkout")}
            >
              Proceed to Checkout
            </button>

       

          </div>
        </div>

        {/* Remove confirmation modal */}
        {confirmRemove !== null && (
          <div
            className="modal fade show d-block"
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
      <Footer />
    </>
  );
}
