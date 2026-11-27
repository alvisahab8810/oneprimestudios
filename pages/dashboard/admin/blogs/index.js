// pages/dashboard/admin/blogs/index.js — all blog posts with stats, search,
// status filter and a card or table view.
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  MdSearch, MdAdd, MdEdit, MdDelete, MdArticle, MdVisibility,
  MdGridView, MdTableRows, MdOpenInNew, MdPublic, MdDrafts, MdLibraryBooks,
} from "react-icons/md";

const VIEW_KEY = "ops_blogs_view";
const RED = "#E10600";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS = {
  published: { label: "Live", bg: "#dcfce7", color: "#15803d" },
  scheduled: { label: "Scheduled", bg: "#fef3c7", color: "#b45309" },
  draft: { label: "Draft", bg: "#f3f4f6", color: "#6b7280" },
};

export default function AdminBlogsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("card");

  // Remember the chosen view per browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "card" || saved === "table") setView(saved);
    } catch {}
  }, []);
  function changeView(v) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  useEffect(() => {
    axios
      .get("/api/admin/blogs", { withCredentials: true })
      .then(({ data }) => setBlogs(Array.isArray(data?.blogs) ? data.blogs : []))
      .catch((err) => toast.error(err?.response?.data?.message || "Could not load blogs."))
      .finally(() => setLoading(false));
  }, []);

  async function deleteBlog(blog) {
    if (!confirm(`Delete "${blog.title}"? Its comments will be deleted too.`)) return;
    try {
      await axios.delete(`/api/admin/blogs/${blog.id}`, { withCredentials: true });
      setBlogs((prev) => prev.filter((b) => b.id !== blog.id));
      toast.success("Blog deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the blog.");
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = blogs.filter((b) => {
    const matchSearch = !q || (b.title || "").toLowerCase().includes(q) || (b.authorName || "").toLowerCase().includes(q);
    return matchSearch && (filter === "all" || b.status === filter);
  });

  const stats = [
    { label: "Total blogs", value: blogs.length, icon: MdLibraryBooks, color: "#6366f1" },
    { label: "Live", value: blogs.filter((b) => b.status === "published").length, icon: MdPublic, color: "#15803d" },
    { label: "Drafts", value: blogs.filter((b) => b.status === "draft").length, icon: MdDrafts, color: "#b45309" },
    { label: "Total views", value: blogs.reduce((s, b) => s + (b.views || 0), 0).toLocaleString("en-IN"), icon: MdVisibility, color: RED },
  ];

  const goCreate = () => router.push("/dashboard/admin/blogs/create");
  const goEdit = (id) => router.push(`/dashboard/admin/blogs/create?id=${id}`);
  const pill = (status) => STATUS[status] || STATUS.draft;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Head><title>Blogs | Admin</title></Head>
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Blogs</span>
          <button type="button" onClick={goCreate} style={s.addBtn}>
            <MdAdd size={18} /> Add new blog
          </button>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={s.statsRow}>
            {stats.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.label} style={s.statCard}>
                  <div>
                    <p style={s.statLabel}>{st.label}</p>
                    <p style={s.statValue}>{st.value}</p>
                  </div>
                  <span style={{ ...s.statIcon, color: st.color, background: `${st.color}14` }}>
                    <Icon size={22} />
                  </span>
                </div>
              );
            })}
          </div>

          <div style={s.toolbar}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <MdSearch size={18} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
              <input
                id="blogs-search"
                placeholder="Search by title or author…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...s.input, width: "100%", paddingLeft: 34 }}
              />
            </div>
            <select id="blogs-status" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...s.input, minWidth: 150, cursor: "pointer" }}>
              <option value="all">All status</option>
              <option value="published">Live</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div style={s.sectionRow}>
            <h2 style={s.sectionTitle}>
              All posts
              {!loading && filtered.length > 0 && (
                <span style={s.sectionCount}>{filtered.length} {filtered.length === 1 ? "blog" : "blogs"}</span>
              )}
            </h2>
            <div style={s.viewToggle}>
              <button type="button" style={{ ...s.viewBtn, ...(view === "card" ? s.viewBtnOn : null) }} onClick={() => changeView("card")}>
                <MdGridView size={16} /> Cards
              </button>
              <button type="button" style={{ ...s.viewBtn, ...(view === "table" ? s.viewBtnOn : null) }} onClick={() => changeView("table")}>
                <MdTableRows size={16} /> Table
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <div style={s.empty}>
              <MdArticle size={48} style={{ color: "#d1d5db", marginBottom: 12 }} />
              <p style={{ color: "#9ca3af" }}>
                {blogs.length ? "No blogs match your filters." : "No blogs yet. Create your first post."}
              </p>
              {!blogs.length && (
                <button type="button" style={{ ...s.addBtn, marginLeft: 0, marginTop: 8 }} onClick={goCreate}>
                  <MdAdd size={18} /> Add new blog
                </button>
              )}
            </div>
          ) : view === "table" ? (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, width: 54, textAlign: "center" }}>#</th>
                    <th style={s.th}>Title</th>
                    <th style={s.th}>Category</th>
                    <th style={s.th}>Author</th>
                    <th style={s.th}>Status</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Views</th>
                    <th style={s.th}>Created</th>
                    <th style={{ ...s.th, textAlign: "center", width: 150 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((blog, i) => {
                    const p = pill(blog.status);
                    return (
                      <tr key={blog.id} style={i % 2 ? { background: "#fcfcfd" } : null}>
                        <td style={{ ...s.td, textAlign: "center", fontWeight: 700, color: "#6b7280" }}>{i + 1}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: "#1a1a2e", maxWidth: 320 }} title={blog.title}>{blog.title || "Untitled"}</td>
                        <td style={s.td}>{blog.categories?.[0] || "—"}</td>
                        <td style={s.td}>{blog.authorName || "—"}</td>
                        <td style={s.td}><span style={{ ...s.pill, background: p.bg, color: p.color }}>{p.label}</span></td>
                        <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(blog.views || 0).toLocaleString("en-IN")}</td>
                        <td style={s.td}>{fmtDate(blog.createdAt)}</td>
                        <td style={{ ...s.td, textAlign: "center", whiteSpace: "nowrap" }}>
                          {blog.status === "published" && (
                            <a href={`/blogs/${blog.slug}`} target="_blank" rel="noopener noreferrer" style={s.iconBtn} title="View live">
                              <MdOpenInNew size={15} />
                            </a>
                          )}
                          <button type="button" style={s.iconBtn} title="Edit" onClick={() => goEdit(blog.id)}>
                            <MdEdit size={15} />
                          </button>
                          <button type="button" style={{ ...s.iconBtn, ...s.iconBtnDel }} title="Delete" onClick={() => deleteBlog(blog)}>
                            <MdDelete size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={s.grid}>
              {filtered.map((blog, i) => {
                const p = pill(blog.status);
                const img = blog.cardImage?.src || blog.coverImage?.src;
                return (
                  <div key={blog.id} style={s.card}>
                    <div style={s.cardImgWrap}>
                      {img ? (
                        <img src={img} alt={blog.cardImage?.alt || blog.title} style={s.cardImg} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <div style={s.cardImgPlaceholder}><MdArticle size={36} style={{ color: "#d1d5db" }} /></div>
                      )}
                      <span style={s.numBadge}>{i + 1}</span>
                      <span style={{ ...s.badge, background: p.bg, color: p.color }}>{p.label}</span>
                    </div>
                    <div style={s.cardBody}>
                      {blog.categories?.length > 0 && <p style={s.cardCat}>{blog.categories[0]}</p>}
                      <h3 style={s.cardTitle} title={blog.title}>
                        {blog.title?.length > 60 ? blog.title.slice(0, 60) + "…" : blog.title}
                      </h3>
                      {blog.authorName && <p style={s.cardAuthor}>By {blog.authorName}</p>}
                      <div style={s.cardMeta}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <MdVisibility size={13} />{(blog.views || 0).toLocaleString("en-IN")} views
                        </span>
                        <span>{fmtDate(blog.createdAt)}</span>
                      </div>
                    </div>
                    <div style={s.cardActions}>
                      <button type="button" style={s.editBtn} onClick={() => goEdit(blog.id)}>
                        <MdEdit size={14} /> Edit
                      </button>
                      {blog.status === "published" && (
                        <a href={`/blogs/${blog.slug}`} target="_blank" rel="noopener noreferrer" style={s.viewLink} title="View live">
                          <MdOpenInNew size={14} />
                        </a>
                      )}
                      <button type="button" style={s.delBtn} onClick={() => deleteBlog(blog)}>
                        <MdDelete size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  addBtn: { marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, border: 0, background: RED, color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 20 },
  statCard: { background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  statLabel: { fontSize: 13, color: "#6b7280", margin: "0 0 6px", fontWeight: 500 },
  statValue: { fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: 0 },
  statIcon: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  toolbar: { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  input: { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", boxSizing: "border-box", outline: "none" },
  sectionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: 0, display: "flex", alignItems: "center", gap: 10 },
  sectionCount: { fontSize: 12, fontWeight: 600, color: "#6b7280", background: "#eceef2", borderRadius: 20, padding: "3px 10px" },
  viewToggle: { display: "flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", background: "#fff" },
  viewBtn: { display: "flex", alignItems: "center", gap: 6, height: 34, border: "none", background: "#fff", color: "#6b7280", fontSize: 13, fontWeight: 600, padding: "0 14px", cursor: "pointer" },
  viewBtnOn: { background: RED, color: "#fff" },
  numBadge: { position: "absolute", top: 10, right: 10, minWidth: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,26,46,0.85)", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 20, padding: "0 7px" },
  tableWrap: { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, padding: "12px 14px", borderBottom: "1.5px solid #e8eaf0", whiteSpace: "nowrap", background: "#fafbfc" },
  td: { fontSize: 13, color: "#374151", padding: "12px 14px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  pill: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" },
  iconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, marginRight: 6, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", verticalAlign: "middle" },
  iconBtnDel: { background: "#fff2f2", color: RED, border: "1px solid #fecaca", marginRight: 0 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", background: "#fff", borderRadius: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 },
  card: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column" },
  cardImgWrap: { position: "relative", height: 160, background: "#f3f4f6", flexShrink: 0 },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardImgPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 },
  cardBody: { padding: "14px 14px 8px", flex: 1 },
  cardCat: { fontSize: 11, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 5px" },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px", lineHeight: 1.4 },
  cardAuthor: { fontSize: 12, color: "#9ca3af", margin: "0 0 6px" },
  cardMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" },
  cardActions: { display: "flex", gap: 8, padding: "10px 14px 14px", borderTop: "1px solid #f3f4f6" },
  editBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 7, padding: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  viewLink: { display: "flex", alignItems: "center", justifyContent: "center", width: 36, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7 },
  delBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff2f2", color: RED, border: "1px solid #fecaca", borderRadius: 7, padding: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
