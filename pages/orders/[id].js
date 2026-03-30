"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { toast } from "react-hot-toast";
import Offcanvas from "@/components/header/Offcanvas";
import {
  FiPackage, FiCalendar, FiTruck, FiUser, FiCreditCard,
  FiMapPin, FiFileText, FiArrowLeft, FiUpload, FiAlertCircle,
  FiCheckCircle, FiClock, FiXCircle,
} from "react-icons/fi";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  "Order Received":   { dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
  "Design Approved":  { dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
  "Design Rejected":  { dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
  "In Progress":      { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  "Order Ready":      { dot: "#8b5cf6", bg: "#f5f3ff", text: "#5b21b6" },
  "In Packaging":     { dot: "#6b7280", bg: "#f9fafb", text: "#374151" },
  "Order Dispatched": { dot: "#0ea5e9", bg: "#f0f9ff", text: "#0369a1" },
  "Order Delivered":  { dot: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  "Pending":          { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  "Cancelled":        { dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
};

const scfg = (s) => STATUS_CFG[s] || { dot: "#9ca3af", bg: "#f9fafb", text: "#6b7280" };

// ── Timeline steps ────────────────────────────────────────────────────────────
const TIMELINE = [
  "Order Received", "Design Approved", "In Progress",
  "In Packaging", "Order Dispatched", "Order Delivered",
];

// ── Dimension validation helpers (mirrors ProductFileUpload.js logic) ─────────
const PRINT_DPI = 300;

const getRawDimValues = (dim) => {
  if (!dim) return "";
  if (typeof dim === "string") return dim;
  if (typeof dim === "object") return dim.values || "";
  return "";
};

const formatDimForDisplay = (dim) => {
  if (!dim) return "";
  if (typeof dim === "string") return dim;
  if (typeof dim === "object") {
    const v = (dim.values || "").trim();
    const u = dim.unit || "px";
    if (!v) return "";
    return `${v} ${u === "inch" ? "inch" : u === "mm" ? "mm" : "px"}`;
  }
  return "";
};

const parseAllowedDims = (dimStr) => {
  if (!dimStr) return [];
  const norm = String(dimStr).replace(/\u00D7/gi, "x").replace(/\s+/g, "").toLowerCase();
  return norm.split(",").map(p => {
    const parts = p.trim().split("x");
    if (parts.length < 2) return null;
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    return (isNaN(w) || isNaN(h)) ? null : { w, h };
  }).filter(Boolean);
};

const getToleranceForUnit = (unit) => unit === "mm" ? 2 : unit === "inch" ? 0.1 : 2;

const loadPdfJsForReupload = async () => {
  if (typeof window === "undefined") return null;
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
};

// Returns true if valid, false if invalid (shows its own toast on failure)
const validateReuploadDimensions = async (file, allImageDimensions) => {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "cdr") return true; // CDR: browser can't read dims — skip

  const isPdf = file.type === "application/pdf" || ext === "pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) return true; // other types: no dim check

  const activeDims = allImageDimensions.filter(d => getRawDimValues(d).trim().length > 0);
  if (!activeDims.length) return true; // no dimension rules set — accept all

  // ── Read file dimensions once ──────────────────────────────────────────────
  let fileDims = null;

  if (isImage) {
    fileDims = await new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ wPx: img.width, hPx: img.height }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
    if (!fileDims) {
      toast.error("Could not read image dimensions. Please try another file.");
      return false;
    }
  }

  if (isPdf) {
    toast.loading("Reading PDF dimensions...", { id: "pdf-dim-check" });
    try {
      const pdfjsLib = await loadPdfJsForReupload();
      if (pdfjsLib) {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1 });
        fileDims = { wPts: vp.width, hPts: vp.height };
      }
    } catch (e) { /* unreadable */ }
    toast.dismiss("pdf-dim-check");
    if (!fileDims) return true; // PDF.js couldn't read it — accept rather than block
  }

  // ── Check file against each configured dimension (accept if ANY matches) ──
  const errors = [];

  for (const imageDimensions of activeDims) {
    const rawVals = getRawDimValues(imageDimensions);
    const dimUnit = (imageDimensions && typeof imageDimensions === "object")
      ? (imageDimensions.unit || "px") : "px";
    const display = formatDimForDisplay(imageDimensions);
    const allowedNative = parseAllowedDims(rawVals);
    if (!allowedNative.length) continue;

    if (isImage) {
      let dimsInPx = allowedNative;
      if (dimUnit === "inch")
        dimsInPx = allowedNative.map(d => ({ w: Math.round(d.w * PRINT_DPI), h: Math.round(d.h * PRINT_DPI) }));
      else if (dimUnit === "mm")
        dimsInPx = allowedNative.map(d => ({ w: Math.round((d.w / 25.4) * PRINT_DPI), h: Math.round((d.h / 25.4) * PRINT_DPI) }));

      const tol = getToleranceForUnit("px");
      if (dimsInPx.some(d => Math.abs(d.w - fileDims.wPx) <= tol && Math.abs(d.h - fileDims.hPx) <= tol))
        return true; // ✅ matches this config
      errors.push(display);
    }

    if (isPdf) {
      const toUnit = (pts, u) =>
        u === "inch" ? Math.round((pts / 72) * 100) / 100
        : u === "mm"  ? Math.round((pts / 72) * 25.4 * 100) / 100
        : Math.round(pts);
      const fileW = toUnit(fileDims.wPts, dimUnit);
      const fileH = toUnit(fileDims.hPts, dimUnit);
      const tol = getToleranceForUnit(dimUnit);
      if (allowedNative.some(d => Math.abs(d.w - fileW) <= tol && Math.abs(d.h - fileH) <= tol))
        return true; // ✅ matches
      errors.push(`${display} (your file: ${fileW}x${fileH} ${dimUnit})`);
    }
  }

  // All configs failed
  if (errors.length) {
    if (isImage)
      toast.error(`Invalid image size. Your file: ${fileDims.wPx}x${fileDims.hPx} px. Allowed: ${errors.join(" or ")}`);
    else
      toast.error(`Invalid PDF size. Allowed: ${errors.join(" or ")}`);
    return false;
  }
  return true;
};

export default function OrderDetailPage() {
  const [reuploading, setReuploading] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        setOrder(res.data.order);
      } catch {
        toast.error("Failed to load order details");
        router.push("/orders");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const sendDispatchRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/api/orders/dispatch-request/${order._id}`, {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      toast.success("Dispatch request sent!");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send dispatch request");
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/api/orders/${order._id}/cancel`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Order cancelled. Wallet refunded.");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  // Collect upload rules from all upload-type attributes across all order items
  const getUploadRules = () => {
    const rules = (order?.items || []).flatMap(item =>
      (item.product?.attributes || [])
        .filter(attr => attr.type === "upload")
        .map(attr => attr.uploadRules)
    ).filter(Boolean);
    const acceptTypes = [...new Set(rules.flatMap(r => r.acceptTypes || []))];
    const maxSizeMB = rules.length > 0
      ? Math.min(...rules.map(r => r.maxSizeMB || 10))
      : 10;
    const allImageDimensions = rules.map(r => r.imageDimensions).filter(Boolean);
    return { acceptTypes, maxSizeMB, allImageDimensions };
  };

  const reuploadDesign = async (file) => {
    if (!file) return;

    const { acceptTypes, maxSizeMB, allImageDimensions } = getUploadRules();

    // 1. Validate format
    if (acceptTypes.length > 0) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!acceptTypes.map(t => t.toLowerCase()).includes(ext)) {
        toast.error(`Only ${acceptTypes.map(t => t.toUpperCase()).join(", ")} files are allowed`);
        return;
      }
    }

    // 2. Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File size must be under ${maxSizeMB}MB`);
      return;
    }

    // 3. Validate dimensions (image px / PDF pts / CDR skipped)
    if (allImageDimensions.length > 0) {
      const dimOk = await validateReuploadDimensions(file, allImageDimensions);
      if (!dimOk) return;
    }

    const fd = new FormData();
    fd.append("file", file);
    try {
      setReuploading(true);
      const token = localStorage.getItem("token");
      await axios.post(`/api/orders/reupload-design/${order._id}`, fd,
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Design re-uploaded successfully");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to re-upload design");
    } finally {
      setReuploading(false);
    }
  };

  const calculatedSubtotal = typeof order?.subtotal === "number"
    ? order.subtotal
    : order?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || order?.total || 0;
  const calculatedDiscount = order?.coupon?.discountAmount || 0;
  const calculatedGst = order?.gstAmount || 0;

  const currentStep = TIMELINE.indexOf(order?.status);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Topbar /><Offcanvas />
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f5" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid #e5e5e5", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14, fontWeight: 500 }}>Loading order...</p>
        </div>
      </div>
      <Footer />
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  if (!order) return null;

  const c = scfg(order.status);
  const canCancel = ["Pending","Order Received","In Packaging","Design Rejected"].includes(order.status);

  return (
    <>
      <Topbar />
      <Offcanvas />

      <div style={{ minHeight: "100vh", background: "#f7f7f5", fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px 80px" }}>

          {/* ── Back ── */}
          <button onClick={() => router.push("/orders")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0 }}>
            <FiArrowLeft size={14} /> Back to Orders
          </button>

          {/* ── Hero card ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "24px 28px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>Order</p>
                <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>
                  #{order.orderNumber || id?.slice(-6)}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9ca3af" }}>
                  <FiCalendar size={12} />
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: c.bg, color: c.text, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot }} />
                  {order.status}
                </span>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => router.push(`/track-order/${order._id}`)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}>
                    <FiTruck size={13} /> Track Order
                  </button>

                  {canCancel && (
                    <button onClick={cancelOrder}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#fff", color: "#b91c1c", border: "1.5px solid #fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <FiXCircle size={13} /> Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Order timeline ── */}
          {currentStep >= 0 && order.status !== "Cancelled" && order.status !== "Design Rejected" && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "22px 28px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 18px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>Order Progress</p>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                {TIMELINE.map((step, i) => {
                  const done   = i <= currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {i < TIMELINE.length - 1 && (
                        <div style={{ position: "absolute", top: 12, left: "50%", width: "100%", height: 2, background: i < currentStep ? "#111" : "#e5e5e5", zIndex: 0 }} />
                      )}
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? "#111" : "#f0f0f0", border: `2px solid ${done ? "#111" : "#e5e5e5"}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative", flexShrink: 0 }}>
                        {done && <FiCheckCircle size={12} color="#fff" />}
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: active ? 700 : 500, color: done ? "#111" : "#9ca3af", textAlign: "center", lineHeight: 1.3 }}>
                        {step.replace("Order ", "").replace("In ", "")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Alerts ── */}
          {order.status === "Design Rejected" && order.remarks && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10 }}>
              <FiAlertCircle size={18} color="#b91c1c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#b91c1c" }}>Design Rejected</p>
                <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d" }}>{order.remarks}</p>
              </div>
            </div>
          )}

          {order.status === "Order Ready" && order.dispatchRequest === "none" && (
            <div style={{ background: "#f5f3ff", border: "1.5px solid #c4b5fd", borderRadius: 12, padding: "16px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#5b21b6" }}>Your order is ready!</p>
                <p style={{ margin: 0, fontSize: 13, color: "#6d28d9" }}>Request dispatch when you're ready to receive it.</p>
              </div>
              <button onClick={sendDispatchRequest}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#7c3aed", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Request Dispatch
              </button>
            </div>
          )}

          {order.status === "Order Ready" && order.dispatchRequest === "pending" && (
            <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
              <FiClock size={16} color="#1d4ed8" />
              <p style={{ margin: 0, fontSize: 13, color: "#1e40af", fontWeight: 500 }}>Dispatch request sent — awaiting admin approval.</p>
            </div>
          )}

          {order.dispatchRequest === "approved" && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
              <FiCheckCircle size={16} color="#15803d" />
              <p style={{ margin: 0, fontSize: 13, color: "#166534", fontWeight: 500 }}>Dispatch request approved — your order is on the way.</p>
            </div>
          )}

          {/* ── Re-upload section ── */}
          {order.status === "Design Rejected" && (() => {
            const { acceptTypes, maxSizeMB, allImageDimensions } = getUploadRules();
            const acceptStr = acceptTypes.length > 0 ? acceptTypes.map(t => `.${t}`).join(",") : undefined;
            const dimHints = allImageDimensions
              .map(d => formatDimForDisplay(d))
              .filter(Boolean);
            const hintParts = [];
            if (acceptTypes.length > 0) hintParts.push(`Formats: ${acceptTypes.map(t => t.toUpperCase()).join(", ")}`);
            if (dimHints.length > 0) hintParts.push(`Size: ${dimHints.join(" or ")}`);
            hintParts.push(`Max: ${maxSizeMB}MB`);
            const hintText = hintParts.join(" · ");
            return (
              <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "20px 24px", marginBottom: 16 }}>
                <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 14, color: "#111", display: "flex", alignItems: "center", gap: 7 }}>
                  <FiUpload size={14} /> Re-upload Your Design
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 10, border: "2px dashed #e5e5e5", borderRadius: 10, padding: "14px 18px", cursor: "pointer", background: reuploading ? "#f9fafb" : "#fff" }}>
                  <FiUpload size={16} color="#9ca3af" />
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    {reuploading ? "Uploading..." : "Click to choose file"}
                  </span>
                  <input type="file" style={{ display: "none" }} disabled={reuploading}
                    accept={acceptStr}
                    onChange={e => reuploadDesign(e.target.files[0])} />
                </label>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af" }}>{hintText}</p>
              </div>
            );
          })()}

          {/* ── Delivery challan ── */}
          {order.status === "Order Delivered" && order.deliveryChallan?.fileUrl && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, color: "#15803d", display: "flex", alignItems: "center", gap: 6 }}>
                <FiTruck size={14} /> Order Delivered
              </p>
              {order.deliveryRemarks && <p style={{ margin: "0 0 10px", fontSize: 13, color: "#166534" }}>{order.deliveryRemarks}</p>}
              <a href={order.deliveryChallan.fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#15803d", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                <FiFileText size={12} /> Download Challan
              </a>
              {order.deliveredAt && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#166534" }}>
                  Delivered on {new Date(order.deliveredAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}

          {/* ── Two-col info ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>

            {/* Customer */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "20px 22px" }}>
              <p style={sectionLabel}><FiUser size={11} style={{ marginRight: 5 }} />Customer</p>
              <InfoRow label="Name"   value={order.shipping?.name || order.user?.name} />
              <InfoRow label="Email"  value={order.user?.email} />
              <InfoRow label="Phone"  value={order.shipping?.phone || order.user?.phone} />
              {(order.shipping?.companyName || order.user?.companyName) &&
                <InfoRow label="Company" value={order.shipping?.companyName || order.user?.companyName} />}
              {(order.shipping?.gstNumber || order.user?.gstNumber) &&
                <InfoRow label="GST" value={order.shipping?.gstNumber || order.user?.gstNumber} />}
            </div>

            {/* Shipping */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "20px 22px" }}>
              <p style={sectionLabel}><FiMapPin size={11} style={{ marginRight: 5 }} />Shipping Address</p>
              <p style={{ margin: "0 0 6px", fontSize: 14, color: "#111", lineHeight: 1.6 }}>
                {order.shipping?.street}<br />
                {order.shipping?.city}, {order.shipping?.state} {order.shipping?.zip}
              </p>
              <InfoRow label="Payment" value={order.paymentMethod || "Cash on Delivery"} />
            </div>
          </div>

          {/* ── Order items ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "20px 22px", marginBottom: 16 }}>
            <p style={sectionLabel}><FiPackage size={11} style={{ marginRight: 5 }} />Ordered Items</p>

            <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px", padding: "10px 16px", background: "#f7f7f5", borderBottom: "1px solid #f0f0f0" }}>
                {["Product", "Qty", "Price", "Subtotal"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                ))}
              </div>

              {order.items?.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px", padding: "14px 16px", borderBottom: i < order.items.length - 1 ? "1px solid #f5f5f5" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {item.product?.mainImage ? (
                      <img src={item.product.mainImage} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1px solid #f0f0f0" }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FiPackage size={16} color="#9ca3af" />
                      </div>
                    )}
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#111" }}>
                        {item.product?.name || "Product"}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>₹{item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{item.quantity}</span>
                  <span style={{ fontSize: 14, color: "#374151" }}>₹{item.price.toFixed(2)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Payment summary ── */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f0f0f0", padding: "20px 22px", marginBottom: 28 }}>
            <p style={sectionLabel}><FiCreditCard size={11} style={{ marginRight: 5 }} />Payment Summary</p>

            <div style={{ maxWidth: 320, marginLeft: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: "#6b7280" }}>Subtotal</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>₹{calculatedSubtotal.toFixed(2)}</span>
              </div>

              {calculatedDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "#15803d" }}>
                    Discount {order.coupon?.code && `(${order.coupon.code})`}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>− ₹{calculatedDiscount.toFixed(2)}</span>
                </div>
              )}

              {calculatedGst > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>GST</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>₹{calculatedGst.toFixed(2)}</span>
                </div>
              )}

              <div style={{ height: 1, background: "#f0f0f0", margin: "12px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Total Payable</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .od-two-col { grid-template-columns: 1fr !important; }
          .od-table-row { grid-template-columns: 1fr 60px 80px 80px !important; }
        }
      `}</style>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 13, color: "#9ca3af", minWidth: 60 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const sectionLabel = {
  margin: "0 0 14px",
  fontSize: 11, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase",
  color: "#9ca3af", display: "flex", alignItems: "center",
};


// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import { toast } from "react-hot-toast";
// import {
//   FaBoxOpen,
//   FaCalendarAlt,
//   FaTruck,
//   FaUser,
//   FaCreditCard,
//   FaMapMarkerAlt,
//   FaFileInvoice,
// } from "react-icons/fa";
// import Offcanvas from "@/components/header/Offcanvas";

// export default function OrderDetailPage() {
//   const [reuploading, setReuploading] = useState(false);

//   const router = useRouter();
//   const { id } = router.query;
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const sendDispatchRequest = async () => {
//     try {
//       const token = localStorage.getItem("token");

//       const res = await axios.post(
//         `/api/orders/dispatch-request/${order._id}`,
//         {},
//         { headers: token ? { Authorization: `Bearer ${token}` } : {} },
//       );

//       toast.success("Dispatch request sent!");
//       // reload page
//       window.location.reload();
//     } catch (err) {
//       toast.error(
//         err.response?.data?.message || "Failed to send dispatch request",
//       );
//     }
//   };

//   useEffect(() => {
//     if (!id) return;
//     const fetchOrder = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(`/api/orders/${id}`, {
//           headers: token ? { Authorization: `Bearer ${token}` } : {},
//           withCredentials: true,
//         });
//         setOrder(res.data.order);
//       } catch (err) {
//         console.error("❌ Order fetch error:", err);
//         toast.error("Failed to load order details");
//         router.push("/orders");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchOrder();
//   }, [id, router]);

//   // ✅ SAFE SUBTOTAL CALCULATION
//   const calculatedSubtotal =
//     typeof order?.subtotal === "number"
//       ? order.subtotal
//       : order?.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) ||
//         order?.total ||
//         0;

//   // ✅ SAFE DISCOUNT CALCULATION
//   const calculatedDiscount = order?.coupon?.discountAmount || 0;

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

//   if (!order)
//     return (
//       <div className="text-center py-5">
//         <h5>Order not found</h5>
//       </div>
//     );

//   const getStatusBadgeClass = (status) => {
//     switch (status) {
//       case "Delivered":
//       case "Order Delivered":
//         return "bg-success";
//       case "Shipped":
//       case "Order Dispatched":
//         return "bg-info text-dark";
//       case "Processing":
//       case "In Progress":
//         return "bg-warning text-dark";
//       case "Cancelled":
//       case "Design Rejected":
//         return "bg-danger";
//       default:
//         return "bg-secondary";
//     }
//   };

//   return (
//     <div className="order-details-area">
//       <Topbar />
//       <Offcanvas />

//       <div className="container  padding-top-40">
//         {/* HEADER */}
//         <div className="card mb-4 p-4">
//           <div className="d-flex justify-content-between gap-3 ">
//             <div>
//               <h4 className="fw-bold mb-2">
//                 <FaFileInvoice className="me-2 primary-c" />
//                 Order #{order.orderNumber || id.slice(-6)}
//               </h4>
//               <small className="text-muted">
//                 <FaCalendarAlt className="me-1" />
//                 {new Date(order.createdAt).toLocaleString()}
//               </small>
//             </div>

//             <div className="top-buttons-area">
//               <span
//                 className={`badge px-3 py-2 fs-6 ${getStatusBadgeClass(
//                   order.status,
//                 )}`}
//               >
//                 {order.status}
//               </span>


//                 {["Pending", "Order Received", "In Packaging", "Design Rejected",].includes(
//           order.status,
//         ) && (
//           <button
//             className="badge px-3 py-2 fs-6 bg-danger border-0"
//             onClick={async () => {
//               if (!confirm("Are you sure you want to cancel this order?"))
//                 return;

//               try {
//                 const token = localStorage.getItem("token");
//                 await axios.post(
//                   `/api/orders/${order._id}/cancel`,
//                   {},
//                   {
//                     headers: { Authorization: `Bearer ${token}` },
//                   },
//                 );

//                 toast.success("Order cancelled. Wallet refunded.");
//                 window.location.reload();
//               } catch (err) {
//                 toast.error(err.response?.data?.message || "Cancel failed");
//               }
//             }}
//           >
//             Cancel Order
//           </button>
//         )}






//               {/* ✔ If order is READY — show button */}
//               {order.status === "Order Ready" &&
//                 order.dispatchRequest === "none" && (
//                   <div className="mt-3">
//                     <button
//                       className="track-order-btn"
//                       onClick={sendDispatchRequest}
//                     >
//                       Send Dispatch Request
//                     </button>
//                   </div>
//                 )}

//               {/* ✔ When request sent but admin has not approved yet */}
//               {order.status === "Order Ready" &&
//                 order.dispatchRequest === "pending" && (
//                   <div className="alert alert-info mt-3">
//                     Dispatch request sent. Waiting for admin approval.
//                   </div>
//                 )}

//               {/* ✔ When admin approves by marking "Order Dispatched" */}
//               {order.dispatchRequest === "approved" && (
//                 <div className="alert alert-success mt-3">
//                   Your dispatch request has been approved.
//                 </div>
//               )}

//               {/* 🚚 DELIVERY DETAILS (VISIBLE TO USER) */}
//               {order.status === "Order Delivered" &&
//                 order.deliveryChallan?.fileUrl && (
//                   <div className="mt-3 p-3 border rounded bg-light">
//                     <h6 className="fw-semibold mb-2 text-success">
//                       <FaTruck className="me-2" />
//                       Order Delivered
//                     </h6>

//                     {/* Admin delivery remarks */}
//                     {order.deliveryRemarks && (
//                       <p className="mb-2">
//                         <strong>Delivery Remarks:</strong>{" "}
//                         {order.deliveryRemarks}
//                       </p>
//                     )}

//                     {/* Delivery challan download */}
//                     <a
//                       href={order.deliveryChallan.fileUrl}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="btn btn-outline-primary btn-sm"
//                     >
//                       <FaFileInvoice className="me-2" />
//                       Download Delivery Challan
//                     </a>

//                     {order.deliveredAt && (
//                       <div className="text-muted small mt-2">
//                         Delivered on:{" "}
//                         {new Date(order.deliveredAt).toLocaleString()}
//                       </div>
//                     )}
//                   </div>
//                 )}

//               {/* ✅ Show rejection reason only when Design Rejected */}
//               {order.status === "Design Rejected" && order.remarks && (
//                 <div className="mt-3 p-3 rounded border border-danger bg-light">
//                   <h6 className="text-danger mb-1">
//                     <FaBoxOpen className="me-2" />
//                     Design Rejected
//                   </h6>
//                   <p className="mb-0">
//                     <strong>Reason:</strong> {order.remarks}
//                   </p>
//                 </div>
//               )}

//               {order.status === "Design Rejected" && (
//                 <div className="mt-3 p-3 border rounded">
//                   <h6 className="fw-semibold mb-2">Re-upload Design</h6>

//                   <input
//                     type="file"
//                     className="form-control mb-2"
//                     onChange={async (e) => {
//                       const file = e.target.files[0];
//                       if (!file) return;

//                       const formData = new FormData();
//                       formData.append("file", file);

//                       try {
//                         setReuploading(true);
//                         const token = localStorage.getItem("token");

//                         await axios.post(
//                           `/api/orders/reupload-design/${order._id}`,
//                           formData,
//                           {
//                             headers: {
//                               Authorization: `Bearer ${token}`,
//                             },
//                           },
//                         );

//                         toast.success("Design re-uploaded successfully");
//                         window.location.reload();
//                       } catch (err) {
//                         toast.error("Failed to re-upload design");
//                       } finally {
//                         setReuploading(false);
//                       }
//                     }}
//                     disabled={reuploading}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         <button
//           onClick={() => router.push(`/track-order/${order._id}`)}
//           className="track-order-btn"
//         >
//           Track Your Order
//         </button>

//         {/* SHIPPING + BILLING INFO */}
//         <div className="card mb-4 p-4">
//           <div className="row">
//             <div className="col-md-6 mb-3 customer-details">
//               <h6 className="fw-semibold mb-2">
//                 <FaUser className="me-2 primary-c" />
//                 Customer Details
//               </h6>
//               <p className="mb-1">
//                 <strong>Name:</strong>{" "}
//                 {order.shipping?.name || order.user?.name}
//               </p>
//               <p className="mb-1">
//                 <strong>Company:</strong>{" "}
//                 {order.shipping?.companyName || order.user?.companyName || "—"}
//               </p>
//               <p className="mb-1">
//                 <strong>GST Number:</strong>{" "}
//                 {order.shipping?.gstNumber || order.user?.gstNumber || "—"}
//               </p>
//               <p className="mb-1">
//                 <strong>Email:</strong> {order.user?.email}
//               </p>
//               <p className="mb-1">
//                 <strong>Phone:</strong>{" "}
//                 {order.shipping?.phone || order.user?.phone}
//               </p>
//             </div>

//             <div className="col-md-6 mb-3">
//               <h6 className="fw-semibold mb-2">
//                 <FaMapMarkerAlt className="me-2 primary-c" />
//                 Shipping Address
//               </h6>
//               <p className="mb-1">{order.shipping?.street}</p>
//               <p className="mb-1">
//                 {order.shipping?.city}, {order.shipping?.state} -{" "}
//                 {order.shipping?.zip}
//               </p>
//               <p className="mb-1">
//                 <strong>Payment Method:</strong>{" "}
//                 {order.paymentMethod || "Cash on Delivery"}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* ORDER ITEMS */}
//         <div className="card mb-4 p-4">
//           <h6 className="fw-semibold mb-3">
//             <FaBoxOpen className="me-2 primary-c" />
//             Ordered Items
//           </h6>
//           <div className="table-responsive">
//             <table className="table table-hover align-middle">
//               <thead className="table-light">
//                 <tr>
//                   <th>Product</th>
//                   <th>Qty</th>
//                   <th>Price</th>
//                   <th>Subtotal</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {order.items?.map((item, i) => (
//                   <tr key={i}>
//                     <td>
//                       <div className="d-flex align-items-center">
//                         <img
//                           src={item.product?.mainImage || "/no-image.png"}
//                           alt={item.product?.name}
//                           width={60}
//                           height={60}
//                           className="rounded me-3"
//                           style={{ objectFit: "cover" }}
//                         />
//                         <div>
//                           <div className="fw-semibold product-name-area">
//                             {item.product?.name || "Unnamed Product"}
//                           </div>
//                           <div className="text-muted small">
//                             ₹{item.price.toFixed(2)} each
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td>{item.quantity}</td>
//                     <td>₹{item.price.toFixed(2)}</td>
//                     <td>₹{(item.price * item.quantity).toFixed(2)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* SUMMARY */}
//         {/* <div className="summary-card card p-3">
//           <h6 className="fw-semibold mb-3">
//             <FaCreditCard className="me-2 primary-c" />
//             Payment Summary
//           </h6>
//           <div className="d-flex justify-content-end">
//             <div style={{ minWidth: "260px" }}>
//               <div className="d-flex justify-content-between mb-2">
//                 <span>Subtotal:</span>
//                 <strong>
//                   ₹{order.subtotal || (order.total * 0.9).toFixed(2)}
//                 </strong>
//               </div>
//               <div className="d-flex justify-content-between mb-2">
//                 <span>Shipping:</span>
//                 <strong>₹{order.shippingCost || 0}</strong>
//               </div>
//               <hr />
//               <div className="d-flex justify-content-between">
//                 <span className="fw-semibold">Total:</span>
//                 <strong className="primary-c fs-5">₹{order.total}</strong>
//               </div>
//             </div>
//           </div>
//         </div> */}

//         <div className="summary-card card p-3">
//           <h6 className="fw-semibold mb-3">Payment Summary</h6>

//           <div className="d-flex justify-content-between mb-2">
//             <span>Subtotal</span>
//             <strong>₹{calculatedSubtotal.toFixed(2)}</strong>
//           </div>

//           {calculatedDiscount > 0 && (
//             <div className="d-flex justify-content-between mb-2 text-success">
//               <span>
//                 Discount {order?.coupon?.code ? `(${order.coupon.code})` : ""}
//               </span>
//               <strong>- ₹{calculatedDiscount.toFixed(2)}</strong>
//             </div>
//           )}

//           <hr />

//           <div className="d-flex justify-content-between">
//             <span className="fw-semibold">Total Payable</span>
//             <strong className="fs-5">₹{order.total.toFixed(2)}</strong>
//           </div>
//         </div>

//         {/* BACK BUTTON */}
//         <div className="text-center mt-4 mb-4">
//           <button
//             onClick={() => router.push("/orders")}
//             className="view-orders-btn"
//           >
//             ← Back to My Orders
//           </button>
//         </div>

      
//       </div>

//       <Footer />
//     </div>
//   );
// }
