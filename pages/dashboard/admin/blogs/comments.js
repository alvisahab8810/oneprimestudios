// pages/dashboard/admin/blogs/comments.js — moderate reader comments on blog posts.
// New comments arrive as "pending" and only appear on the blog once approved.
import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { MdCheck, MdClose, MdDelete, MdComment, MdSearch, MdRefresh, MdForum, MdHourglassTop, MdCheckCircle, MdBlock } from "react-icons/md";

const RED = "#E10600";

const STATUS_COLOR = {
  pending: { bg: "#fef3c7", color: "#b45309" },
  approved: { bg: "#dcfce7", color: "#15803d" },
  rejected: { bg: "#fee2e2", color: "#dc2626" },
};

export default function AdminBlogCommentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState({ comments: [], stats: {} });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: json } = await axios.get("/api/admin/blogs/comments", { params: { status: filter }, withCredentials: true });
      setData({ comments: Array.isArray(json?.comments) ? json.comments : [], stats: json?.stats || {} });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load comments.");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(c, status) {
    setActing(c.id + status);
    try {
      await axios.patch(`/api/admin/blogs/comments/${c.id}`, { status }, { withCredentials: true });
      setData((prev) => {
        const stats = { ...prev.stats };
        if (stats[c.status] != null) stats[c.status] = Math.max(0, stats[c.status] - 1);
        stats[status] = (stats[status] || 0) + 1;
        const comments =
          filter === "all" ? prev.comments.map((x) => (x.id === c.id ? { ...x, status } : x)) : prev.comments.filter((x) => x.id !== c.id);
        return { comments, stats };
      });
      toast.success(status === "approved" ? "Comment approved" : "Comment rejected");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the comment.");
    }
    setActing(null);
  }

  async function del(c) {
    if (!confirm("Delete this comment permanently?")) return;
    setActing(c.id + "del");
    try {
      await axios.delete(`/api/admin/blogs/comments/${c.id}`, { withCredentials: true });
      setData((prev) => {
        const stats = { ...prev.stats, total: Math.max(0, (prev.stats.total || 0) - 1) };
        if (stats[c.status] != null) stats[c.status] = Math.max(0, stats[c.status] - 1);
        return { comments: prev.comments.filter((x) => x.id !== c.id), stats };
      });
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the comment.");
    }
    setActing(null);
  }

  const q = search.trim().toLowerCase();
  const visible = data.comments.filter(
    (c) =>
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.body || "").toLowerCase().includes(q) ||
      (c.blogTitle || c.blogSlug || "").toLowerCase().includes(q)
  );

  const { stats = {} } = data;
  const statCards = [
    { label: "Total", value: stats.total || 0, color: "#6366f1", icon: MdForum },
    { label: "Pending", value: stats.pending || 0, color: "#f59e0b", icon: MdHourglassTop },
    { label: "Approved", value: stats.approved || 0, color: "#10b981", icon: MdCheckCircle },
    { label: "Rejected", value: stats.rejected || 0, color: "#ef4444", icon: MdBlock },
  ];

  const actBtn = { display: "flex", alignItems: "center", gap: 4, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Head><title>Blog Comments | Admin</title></Head>
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Blog Comments</span>
          <button
            type="button"
            onClick={load}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "#f3f4f6", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}
          >
            <MdRefresh size={16} /> Refresh
          </button>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16, marginBottom: 20 }}>
            {statCards.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px", fontWeight: 500 }}>{st.label}</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>{st.value}</p>
                  </div>
                  <span style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: st.color, background: `${st.color}18` }}>
                    <Icon size={22} />
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <MdSearch size={18} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
              <input
                id="comments-search"
                placeholder="Search by name, comment or blog…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 38, width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px 0 34px", fontSize: 13, boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["all", "pending", "approved", "rejected"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                    borderColor: filter === f ? RED : "#e0e0e0",
                    background: filter === f ? RED : "#fff",
                    color: filter === f ? "#fff" : "#374151",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>Loading comments…</p>
          ) : visible.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", background: "#fff", borderRadius: 12 }}>
              <MdComment size={48} style={{ color: "#d1d5db", marginBottom: 12 }} />
              <p style={{ color: "#9ca3af", margin: 0 }}>No comments found.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, overflowX: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                <thead>
                  <tr style={{ background: "#fafbfc", borderBottom: "1px solid #e8eaf0" }}>
                    {["Commenter", "Comment", "Blog", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < visible.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: "0 0 2px" }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{c.email}</p>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 340 }}>
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.body}</p>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <a
                          href={`/blogs/${c.blogSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: RED, textDecoration: "none", fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 180 }}
                        >
                          {c.blogTitle || c.blogSlug}
                        </a>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", whiteSpace: "nowrap", fontSize: 12, color: "#9ca3af" }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", background: STATUS_COLOR[c.status]?.bg || "#f3f4f6", color: STATUS_COLOR[c.status]?.color || "#6b7280" }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {c.status !== "approved" && (
                            <button type="button" onClick={() => act(c, "approved")} disabled={!!acting} style={{ ...actBtn, background: "#dcfce7", color: "#15803d" }}>
                              <MdCheck size={14} /> Approve
                            </button>
                          )}
                          {c.status !== "rejected" && (
                            <button type="button" onClick={() => act(c, "rejected")} disabled={!!acting} style={{ ...actBtn, background: "#fee2e2", color: "#dc2626" }}>
                              <MdClose size={14} /> Reject
                            </button>
                          )}
                          <button type="button" onClick={() => del(c)} disabled={!!acting} title="Delete" aria-label="Delete comment" style={{ ...actBtn, background: "#f3f4f6", color: "#6b7280" }}>
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
