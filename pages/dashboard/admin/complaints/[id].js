// pages/dashboard/admin/complaints/[id].js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell } from "react-icons/fa";

const STATUS_STYLES = {
  Pending:       { bg: "#fef9c3", color: "#854d0e" },
  "Under Review":{ bg: "#dbeafe", color: "#1d4ed8" },
  Initiated:     { bg: "#ede9fe", color: "#6d28d9" },
  Resolved:      { bg: "#dcfce7", color: "#15803d" },
};

export default function AdminComplaintDetail() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params?.id;

  const [complaint, setComplaint]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newStatus, setNewStatus]   = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/admin/complaints/${id}`, { withCredentials: true })
      .then(res => {
        setComplaint(res.data.data);
        setNewStatus(res.data.data.status);
        setAdminReply(res.data.data.adminReply || "");
      })
      .catch(() => { toast.error("Failed to load complaint"); router.push("/dashboard/admin/complaints"); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`/api/admin/complaints/${id}`,
        { status: newStatus, adminReply },
        { withCredentials: true }
      );
      setComplaint(res.data.data);
      toast.success("Complaint updated");
    } catch { toast.error("Failed to update"); }
    finally  { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>Loading...</div>;
  if (!complaint) return null;

  const c = complaint;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>

        {/* Topbar */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Complaint Detail</span>
          <button onClick={() => router.push("/dashboard/admin/complaints")}
            style={{ marginLeft: "auto", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
            ← Back
          </button>
        </nav>

        <div style={{ padding: 24,  margin: "0 auto" }}>

          {/* Header card */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "#6366f1" }}>{c.complaintNumber}</div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
                  Submitted {new Date(c.createdAt).toLocaleString("en-IN")}
                </div>
              </div>
              <span style={{ ...STATUS_STYLES[c.status], borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>
                {c.status}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Customer info */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#374151" }}>Customer</div>
              <div style={{ fontWeight: 500 }}>{c.user?.name || "—"}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{c.user?.email}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{c.user?.phone}</div>
              {c.user?.companyName && <div style={{ fontSize: 13, color: "#888" }}>{c.user.companyName}</div>}
            </div>

            {/* Order info */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#374151" }}>Order Reference</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#6366f1" }}>{c.orderId}</div>
            </div>
          </div>

          {/* Message */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "#374151" }}>Complaint Message</div>
            <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.7 }}>{c.message}</p>
          </div>

          {/* Images */}
          {c.images?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#374151" }}>
                Reference Images ({c.images.length})
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noreferrer">
                    <img src={img} alt={`ref-${i}`} style={{ width: 120, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid #eee" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {c.video && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "#374151" }}>Reference Video</div>
              <video src={c.video} controls style={{ width: "100%", borderRadius: 10, maxHeight: 320 }} />
            </div>
          )}

          {/* Admin action panel */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18, color: "#374151" }}>Update Complaint</div>

            {/* Status selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>Status</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Pending", "Under Review", "Initiated", "Resolved"].map(s => (
                  <button key={s} onClick={() => setNewStatus(s)} type="button"
                    style={{
                      padding: "8px 18px", borderRadius: 20, border: "2px solid",
                      borderColor: newStatus === s ? STATUS_STYLES[s].color : "#e0e0e0",
                      background: newStatus === s ? STATUS_STYLES[s].bg : "#fff",
                      color: newStatus === s ? STATUS_STYLES[s].color : "#888",
                      fontWeight: newStatus === s ? 600 : 400,
                      fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin reply */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
                Reply to Customer (optional)
              </label>
              <textarea
                value={adminReply}
                onChange={e => setAdminReply(e.target.value)}
                rows={4}
                placeholder="Write a message to the customer about this complaint..."
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fafafa" }}
              />
            </div>

            <button onClick={handleUpdate} disabled={saving}
              style={{
                background: saving ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px 28px", fontWeight: 600, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}