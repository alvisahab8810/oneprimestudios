// pages/complaints/index.js  — B2B user complaint submission + list
"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";

const STATUS_COLORS = {
  Pending:       { bg: "#fef9c3", color: "#854d0e" },
  "Under Review":{ bg: "#dbeafe", color: "#1d4ed8" },
  Initiated:     { bg: "#ede9fe", color: "#6d28d9" },
  Resolved:      { bg: "#dcfce7", color: "#15803d" },
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]     = useState(false);

  const [orderId, setOrderId]   = useState("");
  const [message, setMessage]   = useState("");
  const [images, setImages]     = useState([]);  // File[]
  const [video, setVideo]       = useState(null); // File
  const [previews, setPreviews] = useState([]);
  const imageRef = useRef();
  const videoRef = useRef();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchComplaints = async () => {
    try {
      const res = await axios.get("/api/complaints", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data.data || []);
    } catch { toast.error("Failed to load complaints"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return toast.error("Order ID is required");
    if (!message.trim()) return toast.error("Message is required");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("orderId", orderId.trim());
      fd.append("message", message.trim());
      images.forEach(f => fd.append("images", f));
      if (video) fd.append("video", video);

      await axios.post("/api/complaints", fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      toast.success("Complaint submitted successfully");
      setOrderId(""); setMessage(""); setImages([]); setVideo(null); setPreviews([]);
      setShowForm(false);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar />
      <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700 }}>My Complaints</h2>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>Raise and track your support requests</p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            style={{
              background: "#6366f1", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 20px", fontWeight: 600,
              fontSize: 14, cursor: "pointer",
            }}
          >
            {showForm ? "✕ Cancel" : "+ New Complaint"}
          </button>
        </div>

        {/* Complaint form */}
        {showForm && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: 28,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 28,
            border: "1px solid #eee",
          }}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 600, fontSize: 17 }}>Submit a Complaint</h3>
            <form onSubmit={handleSubmit}>

              {/* Order ID */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Order ID *</label>
                <input
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-20260318-1069"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Describe your issue *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Explain your complaint in detail..."
                  style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
                  required
                />
              </div>

              {/* Images */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Reference Images (up to 5)</label>
                <div
                  onClick={() => imageRef.current?.click()}
                  style={{
                    border: "2px dashed #d1d5db", borderRadius: 10, padding: "20px",
                    textAlign: "center", cursor: "pointer", background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🖼</div>
                  <div style={{ fontSize: 13, color: "#888" }}>Click to upload images (JPG, PNG — max 5)</div>
                </div>
                <input ref={imageRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImages} />
                {previews.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {previews.map((p, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={p} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = images.filter((_, idx) => idx !== i);
                            setImages(newImages);
                            setPreviews(newImages.map(f => URL.createObjectURL(f)));
                          }}
                          style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Reference Video (optional, 1 file)</label>
                <div
                  onClick={() => videoRef.current?.click()}
                  style={{
                    border: "2px dashed #d1d5db", borderRadius: 10, padding: "16px",
                    textAlign: "center", cursor: "pointer", background: "#fafafa",
                  }}
                >
                  {video
                    ? <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 500 }}>📹 {video.name}</div>
                    : <div style={{ fontSize: 13, color: "#888" }}>📹 Click to upload video (MP4, MOV)</div>
                  }
                </div>
                <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => setVideo(e.target.files[0] || null)} />
                {video && (
                  <button type="button" onClick={() => setVideo(null)}
                    style={{ marginTop: 6, background: "none", border: "none", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
                    Remove video
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%", background: submitting ? "#a5b4fc" : "#6366f1",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px", fontWeight: 600, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>
          </div>
        )}

        {/* Complaints list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Loading...</div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa", background: "#fff", borderRadius: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 500 }}>No complaints yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click "New Complaint" to raise your first issue</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {complaints.map(c => (
              <div key={c._id} style={{
                background: "#fff", borderRadius: 14, padding: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#6366f1" }}>{c.complaintNumber}</span>
                    <span style={{ marginLeft: 12, fontSize: 13, color: "#888" }}>Order: {c.orderId}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span style={{
                      ...STATUS_COLORS[c.status],
                      borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600,
                    }}>{c.status}</span>
                  </div>
                </div>

                <p style={{ margin: "0 0 10px", fontSize: 14, color: "#444", lineHeight: 1.6 }}>{c.message}</p>

                {/* Images */}
                {c.images?.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {c.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noreferrer">
                        <img src={img} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                      </a>
                    ))}
                  </div>
                )}

                {/* Video */}
                {c.video && (
                  <a href={c.video} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#6366f1", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                    📹 View reference video
                  </a>
                )}

                {/* Admin reply */}
                {c.adminReply && (
                  <div style={{
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#166534",
                  }}>
                    <strong>Admin reply:</strong> {c.adminReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

const labelStyle = { display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" };
const inputStyle  = {
  width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0",
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#fafafa",
};