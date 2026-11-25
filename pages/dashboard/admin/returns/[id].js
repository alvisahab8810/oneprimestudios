// pages/dashboard/admin/returns/[id].js — Admin views one return, exchange or
// refund request, approves or rejects it, moves it through pickup, and then
// either records the refund or the replacement that goes back out.
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaArrowLeft, FaBell } from "react-icons/fa";
import {
  EXCHANGE_SHIPPED_STATUS,
  REQUEST_TYPE_LABELS,
  RETURN_STATUS_STYLES,
  nextStatusesFor,
} from "@/lib/returnRules";

const MANUAL_METHODS = ["Bank Transfer", "UPI", "Other"];

const card = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  padding: 20,
  marginBottom: 20,
};
const label = { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 };
const input = { width: "100%", height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, boxSizing: "border-box" };

export default function AdminReturnDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [refundNote, setRefundNote] = useState("");
  // The replacement shipment on an exchange
  const [exchangeCourier, setExchangeCourier] = useState("");
  const [exchangeAwb, setExchangeAwb] = useState("");
  const [exchangeNote, setExchangeNote] = useState("");
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/returns/${id}`, { withCredentials: true });
      const data = res.data.data;
      setRequest(data);
      setStatus("");
      setRemarks(data.adminRemarks || "");
      // An exchange starts with nothing to refund. If it ends in a refund
      // after all, offer what is left on the order instead of zero.
      setRefundAmount(
        String(
          (Number(data.refund?.amount) > 0 ? data.refund.amount : null) ??
            data.refundContext?.refundable ??
            data.order?.total ??
            ""
        )
      );
      setExchangeCourier(data.exchange?.courier || "");
      setExchangeAwb(data.exchange?.awb || "");
      setExchangeNote(data.exchange?.note || "");
      setRefundMethod(
        data.refund?.method || (data.refundContext?.canRefundAtGateway ? "Razorpay" : "")
      );
      setRefundReference(data.refund?.reference || "");
      setRefundNote(data.refund?.note || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load the request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  // Each kind of request has its own path, so the dropdown offers only the
  // steps that make sense for this one
  const nextOptions = useMemo(() => (request ? nextStatusesFor(request) : []), [request]);
  const isExchange = request?.type === "exchange";

  const save = async () => {
    const shipmentChanged =
      isExchange &&
      (exchangeCourier !== (request.exchange?.courier || "") ||
        exchangeAwb !== (request.exchange?.awb || "") ||
        exchangeNote !== (request.exchange?.note || ""));
    if (!status && !shipmentChanged && remarks === (request.adminRemarks || "")) {
      return toast.error("Nothing to save — choose a status or change the remarks");
    }
    if (status === EXCHANGE_SHIPPED_STATUS && (!exchangeCourier.trim() || !exchangeAwb.trim())) {
      return toast.error("Enter the courier and the tracking (AWB) number for the replacement");
    }
    setSaving(true);
    try {
      const payload = { adminRemarks: remarks };
      if (status) payload.status = status;
      if (status === "Refunded") {
        payload.refundAmount = Number(refundAmount);
        payload.refundMethod = refundMethod;
        payload.refundReference = refundReference;
        payload.refundNote = refundNote;
      } else if (refundAmount !== "" && !isExchange) {
        payload.refundAmount = Number(refundAmount);
      }
      if (isExchange) {
        payload.exchangeCourier = exchangeCourier;
        payload.exchangeAwb = exchangeAwb;
        payload.exchangeNote = exchangeNote;
      }
      await axios.patch(`/api/admin/returns/${id}`, payload, { withCredentials: true });
      toast.success("Request updated");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the request");
    } finally {
      setSaving(false);
    }
  };

  const order = request?.order;
  const badge = RETURN_STATUS_STYLES[request?.status] || {};
  const ctx = request?.refundContext || {};
  const refundDone = Boolean(request?.refund?.refundedAt) && request?.refund?.status !== "failed";
  const methodOptions = [
    ...(ctx.canRefundAtGateway ? ["Razorpay"] : []),
    ...MANUAL_METHODS,
    "Wallet",
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>{isExchange ? "Exchange Request" : "Return Request"}</span>
          <div style={{ marginLeft: "auto" }}><FaBell size={18} color="#888" /></div>
        </nav>

        <div style={{ padding: 24 }}>
          <Link href="/dashboard/admin/returns" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6366f1", textDecoration: "none", marginBottom: 16 }}>
            <FaArrowLeft size={12} /> Back to all requests
          </Link>

          {loading ? (
            <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 60 }}>Loading...</div>
          ) : !request ? (
            <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 60 }}>Request not found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
              {/* ── Left: what the customer reported ─────────────────────── */}
              <div>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#6366f1" }}>{request.requestNumber}</span>
                    <span style={{ ...badge, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{request.status}</span>
                    <span style={{ borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, background: isExchange ? "#ffedd5" : "#eef2ff", color: isExchange ? "#c2410c" : "#4338ca" }}>
                      {REQUEST_TYPE_LABELS[request.type] || "Return"}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
                      Raised {new Date(request.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
                    <div>
                      <div style={label}>Customer</div>
                      <div style={{ fontWeight: 500 }}>{request.user?.name || "—"}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{request.user?.phone || request.user?.email}</div>
                    </div>
                    <div>
                      <div style={label}>Order</div>
                      {order ? (
                        <Link href={`/dashboard/admin/orders/${order._id}`} style={{ color: "#6366f1", textDecoration: "none", fontWeight: 500 }}>
                          {order.orderNumber || order._id}
                        </Link>
                      ) : <div>—</div>}
                      <div style={{ fontSize: 12, color: "#888" }}>{order?.status}</div>
                    </div>
                    <div>
                      <div style={label}>Order total</div>
                      <div style={{ fontWeight: 600 }}>₹{Number(order?.total || 0).toFixed(2)}</div>
                      {order?.paymentMethod && (
                        <div style={{ fontSize: 12, color: "#888" }}>{order.paymentMethod} · {order.paymentStatus}</div>
                      )}
                    </div>
                    <div>
                      <div style={label}>Delivered on</div>
                      <div>{order?.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-IN") : "—"}</div>
                    </div>
                  </div>

                  <hr style={{ margin: "18px 0", borderColor: "#f0f0f0" }} />

                  <div style={label}>Reason</div>
                  <div style={{ fontWeight: 500, marginBottom: 12 }}>{request.reason}</div>
                  {request.description && (
                    <>
                      <div style={label}>What the customer wrote</div>
                      <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{request.description}</div>
                    </>
                  )}
                  {isExchange && (
                    <div style={{ marginTop: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={label}>Wants in exchange</div>
                      <div style={{ color: "#7c2d12", whiteSpace: "pre-wrap" }}>
                        {request.exchange?.preference || "The same item, replaced"}
                      </div>
                    </div>
                  )}
                </div>

                <div style={card}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                    Photos of the issue ({request.images?.length || 0})
                  </div>
                  {request.images?.length ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {request.images.map((url) => (
                        <button
                          key={url}
                          onClick={() => setPreview(url)}
                          style={{ border: "1px solid #eee", borderRadius: 8, padding: 0, background: "none", cursor: "pointer", overflow: "hidden" }}
                        >
                          <img src={url} alt="Reported issue" style={{ width: 120, height: 120, objectFit: "cover", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#aaa", fontSize: 13 }}>No photos attached.</div>
                  )}
                </div>

                {order?.items?.length > 0 && (
                  <div style={card}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Items in this order</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <tbody>
                        {order.items.map((it, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <td style={{ padding: "8px 0" }}>{it.productName || it.product?.name || "Product"}</td>
                            <td style={{ padding: "8px 0", textAlign: "right", color: "#888" }}>× {it.quantity}</td>
                            <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 500 }}>₹{Number(it.price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Right: what the admin does ───────────────────────────── */}
              <div>
                <div style={card}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Update this request</div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={label}>Move to</div>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...input, background: "#fff" }}>
                      <option value="">Keep as {request.status}</option>
                      {nextOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {nextOptions.length === 0 && (
                      <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>This request is closed — no further steps.</div>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={label}>Remarks for the customer</div>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Why it was approved or rejected, pickup date, and so on"
                      style={{ ...input, height: "auto", padding: 10, resize: "vertical" }}
                    />
                  </div>

                  {isExchange && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Replacement shipment</div>

                      {request.exchange?.shippedAt && (
                        <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600, marginBottom: 10 }}>
                          Shipped {new Date(request.exchange.shippedAt).toLocaleString("en-IN")}
                          {request.exchange.deliveredAt
                            ? ` · Delivered ${new Date(request.exchange.deliveredAt).toLocaleString("en-IN")}`
                            : ""}
                        </div>
                      )}

                      <div style={{ marginBottom: 10 }}>
                        <div style={label}>Courier</div>
                        <input
                          id="exchange-courier"
                          value={exchangeCourier}
                          onChange={(e) => setExchangeCourier(e.target.value)}
                          placeholder="Courier that carries the replacement"
                          style={input}
                        />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={label}>Tracking / AWB number</div>
                        <input
                          id="exchange-awb"
                          value={exchangeAwb}
                          onChange={(e) => setExchangeAwb(e.target.value)}
                          placeholder="The customer sees this on their order page"
                          style={input}
                        />
                      </div>
                      <div>
                        <div style={label}>Internal note</div>
                        <input id="exchange-note" value={exchangeNote} onChange={(e) => setExchangeNote(e.target.value)} style={input} />
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: "#888" }}>
                        Courier and tracking number are needed to move the request to <strong>Replacement Shipped</strong>.
                      </div>
                    </div>
                  )}

                  {/* On an exchange the refund form appears only when the admin
                      decides to send the money back instead of a replacement */}
                  <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, marginBottom: 12, display: isExchange && status !== "Refunded" && !refundDone ? "none" : "block" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Refund</div>

                    {refundDone ? (
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        <div style={{ color: request.refund.status === "pending" ? "#92400e" : "#15803d", fontWeight: 600 }}>
                          ₹{Number(request.refund.amount).toFixed(2)} via {request.refund.method}
                          {request.refund.status === "pending" ? " — in progress at Razorpay" : " — completed"}
                        </div>
                        <div style={{ color: "#888" }}>
                          {new Date(request.refund.refundedAt).toLocaleString("en-IN")}
                        </div>
                        {request.refund.reference && (
                          <div style={{ color: "#888" }}>Ref: {request.refund.reference}</div>
                        )}
                        {request.refund.note && <div style={{ color: "#888" }}>{request.refund.note}</div>}
                      </div>
                    ) : (
                      <>
                        {ctx.alreadyRefunded > 0 && (
                          <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                            ₹{Number(ctx.alreadyRefunded).toFixed(2)} already refunded on this order.
                          </div>
                        )}
                        {request.refund?.status === "failed" && (
                          <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 10 }}>
                            The last refund failed at Razorpay. Send it again or record a manual transfer.
                          </div>
                        )}

                        <div style={{ marginBottom: 10 }}>
                          <div style={label}>Amount (₹)</div>
                          <input type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} style={input} />
                          {ctx.refundable !== undefined && (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                              Up to ₹{Number(ctx.refundable).toFixed(2)} can be refunded.
                            </div>
                          )}
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <div style={label}>Sent through</div>
                          <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ ...input, background: "#fff" }}>
                            <option value="">Select method</option>
                            {methodOptions.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                            {refundMethod === "Razorpay"
                              ? "The refund is sent to the original card / UPI automatically."
                              : ctx.canRefundAtGateway === false
                                ? "This order has no Razorpay payment on file, so the refund has to be sent by hand."
                                : "Enter the reference for the transfer you made."}
                          </div>
                        </div>

                        {refundMethod !== "Razorpay" && refundMethod !== "Wallet" && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={label}>Reference / UTR</div>
                            <input
                              value={refundReference}
                              onChange={(e) => setRefundReference(e.target.value)}
                              placeholder="Bank UTR or transaction id"
                              style={input}
                            />
                          </div>
                        )}

                        <div>
                          <div style={label}>Internal note</div>
                          <input value={refundNote} onChange={(e) => setRefundNote(e.target.value)} style={input} />
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, color: "#888" }}>
                          These fields are used when you move the request to <strong>Refunded</strong>.
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={save}
                    disabled={saving}
                    style={{ width: "100%", height: 40, borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>

                <div style={card}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>History</div>
                  {request.history?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {[...request.history].reverse().map((h, i) => (
                        <div key={i} style={{ borderLeft: "2px solid #e0e7ff", paddingLeft: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{h.status}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>
                            by {h.by} · {new Date(h.at).toLocaleString("en-IN")}
                          </div>
                          {h.remarks && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{h.remarks}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#aaa", fontSize: 13 }}>No changes yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24 }}
        >
          <img src={preview} alt="Reported issue" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
