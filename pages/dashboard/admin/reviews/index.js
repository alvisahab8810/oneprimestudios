// pages/dashboard/admin/reviews/index.js — every product review in one place:
// those left by buyers after delivery and those added here by the admin.
// Buyer reviews can be published, hidden or deleted; admin reviews can also
// be edited.
"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaSearch, FaTimes, FaPlus, FaStar, FaEye, FaEyeSlash, FaTrash, FaPen } from "react-icons/fa";

const INPUT = { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", boxSizing: "border-box" };
const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

function Stars({ value = 0, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <FaStar key={s} size={size} color={s <= Math.round(value) ? "#f59e0b" : "#e5e7eb"} aria-hidden="true" />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "inline-flex", gap: 4 }} role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={`${s} star${s > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(s)}
            onClick={() => onChange(s)}
            style={{ background: "none", border: 0, padding: 2, cursor: "pointer", lineHeight: 0 }}
          >
            <FaStar size={26} color={s <= shown ? "#f59e0b" : "#e5e7eb"} />
          </button>
        ))}
      </div>
      <span style={{ fontSize: 13, color: "#6b7280", minWidth: 70 }}>{words[shown] || "Select"}</span>
    </div>
  );
}

// Search box that picks one product, B2B or B2C
function ProductSearch({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const away = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/products/admin/list", { params: { search: query.trim(), limit: 10, page: 1 } });
        if (!cancelled) setResults(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e0e0e0", borderRadius: 8, padding: "8px 12px" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.name}</span>
        <button type="button" onClick={() => onChange(null)} style={{ background: "none", border: 0, color: "#E10600", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        id="review-product-search"
        type="text"
        placeholder="Search a product"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        style={{ ...INPUT, width: "100%" }}
      />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "100%", marginTop: 4, maxHeight: 240, overflowY: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          {loading && <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>No products found</div>}
          {!loading && results.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => { onChange({ _id: String(p._id), name: p.name }); setOpen(false); setQuery(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
            >
              <span style={{ display: "block", fontSize: 14, color: "#111" }}>{p.name}</span>
              <span style={{ display: "block", fontSize: 12, color: "#888" }}>
                {(p.productFor || "").toUpperCase() || "—"} · {p.category?.name || "Uncategorised"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Add a review, or edit one the admin added
function ReviewModal({ review, onClose, onSaved }) {
  const editing = !!review;
  const [product, setProduct] = useState(
    review?.product ? { _id: String(review.product._id || review.product), name: review.product.name || "Product" } : null
  );
  const [userName, setUserName] = useState(review?.userName || "");
  const [rating, setRating] = useState(review?.rating || 5);
  const [comment, setComment] = useState(review?.comment || "");
  const [status, setStatus] = useState(review?.status || "Published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    if (!product) return toast.error("Select a product");
    if (!userName.trim()) return toast.error("Enter the reviewer name");
    if (!(rating >= 1)) return toast.error("Pick a rating");

    const payload = { productId: product._id, userName: userName.trim(), rating, comment: comment.trim(), status };
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`/api/admin/reviews/${review._id}`, payload, { withCredentials: true });
        toast.success("Review updated");
      } else {
        await axios.post("/api/admin/reviews", payload, { withCredentials: true });
        toast.success("Review added");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ ...CARD, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? "Edit review" : "Add a review"}</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: 0, cursor: "pointer", color: "#666" }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="review-product-search" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Product</label>
            <ProductSearch value={product} onChange={setProduct} />
          </div>

          <div>
            <label htmlFor="review-name" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reviewer name</label>
            <input id="review-name" type="text" maxLength={80} value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ ...INPUT, width: "100%" }} />
          </div>

          <div>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Rating</span>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label htmlFor="review-comment" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Review</label>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What the customer said about this product"
              style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{comment.length}/1000</div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input id="review-published" type="checkbox" checked={status === "Published"} onChange={(e) => setStatus(e.target.checked ? "Published" : "Hidden")} />
            Show this review on the product page
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #eee" }}>
          <button type="button" onClick={onClose} style={{ height: 38, padding: "0 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ height: 38, padding: "0 18px", borderRadius: 8, border: 0, background: "#E10600", color: "#fff", fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add review"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminReviewsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, published: 0, hidden: 0, admin: 0, customer: 0, average: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [productFor, setProductFor] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | review
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (source) params.source = source;
      if (status) params.status = status;
      if (rating) params.rating = rating;
      if (productFor) params.productFor = productFor;
      const { data } = await axios.get("/api/admin/reviews", { params, withCredentials: true });
      setRows(data.data || []);
      setSummary(data.summary || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, source, status, rating, productFor]);

  const setFilter = (fn) => (e) => { setPage(1); fn(e.target.value); };
  const hasFilters = search || source || status || rating || productFor;
  const clearFilters = () => {
    setSearchInput(""); setSearch(""); setSource(""); setStatus(""); setRating(""); setProductFor(""); setPage(1);
  };

  const toggleStatus = async (r) => {
    const next = r.status === "Published" ? "Hidden" : "Published";
    setBusyId(r._id);
    try {
      await axios.patch(`/api/admin/reviews/${r._id}`, { status: next }, { withCredentials: true });
      toast.success(next === "Published" ? "Review is now shown" : "Review hidden");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the review");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete this review by ${r.userName || "a buyer"}? This cannot be undone.`)) return;
    setBusyId(r._id);
    try {
      await axios.delete(`/api/admin/reviews/${r._id}`, { withCredentials: true });
      toast.success("Review deleted");
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the review");
    } finally {
      setBusyId("");
    }
  };

  const stats = [
    { label: "All reviews", value: summary.total || 0, color: "#111111" },
    { label: "Average rating", value: summary.total ? `${Number(summary.average || 0).toFixed(1)} ★` : "—", color: "#f59e0b" },
    { label: "From buyers", value: summary.customer || 0, color: "#15803d" },
    { label: "Added by admin", value: summary.admin || 0, color: "#6366f1" },
    { label: "Hidden", value: summary.hidden || 0, color: "#E10600" },
  ];

  const btn = { height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Product Reviews</span>
          <button
            type="button"
            onClick={() => setModal("new")}
            style={{ marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, border: 0, background: "#E10600", color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FaPlus size={12} /> Add review
          </button>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16, marginBottom: 20 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ ...CARD, padding: "16px 20px", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, padding: "14px 18px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <FaSearch style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 12 }} />
              <input
                id="reviews-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by product, name, review text, order no..."
                style={{ ...INPUT, width: "100%", paddingLeft: 32 }}
              />
            </div>
            <select id="reviews-source" value={source} onChange={setFilter(setSource)} style={INPUT} aria-label="Who wrote it">
              <option value="">Buyers and admin</option>
              <option value="customer">From buyers</option>
              <option value="admin">Added by admin</option>
            </select>
            <select id="reviews-for" value={productFor} onChange={setFilter(setProductFor)} style={INPUT} aria-label="Product type">
              <option value="">B2B and B2C</option>
              <option value="b2c">B2C products</option>
              <option value="b2b">B2B products</option>
            </select>
            <select id="reviews-rating" value={rating} onChange={setFilter(setRating)} style={INPUT} aria-label="Rating">
              <option value="">Any rating</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
            </select>
            <select id="reviews-status" value={status} onChange={setFilter(setStatus)} style={INPUT} aria-label="Status">
              <option value="">Shown and hidden</option>
              <option value="Published">Shown</option>
              <option value="Hidden">Hidden</option>
            </select>
            {hasFilters && (
              <button type="button" onClick={clearFilters} style={{ ...INPUT, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: "#f8f8f8" }}>
                <FaTimes size={11} /> Clear
              </button>
            )}
          </div>

          <div style={{ ...CARD, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading reviews...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{hasFilters ? "No reviews match these filters" : "No reviews yet"}</div>
                <div style={{ fontSize: 13, color: "#888" }}>
                  {hasFilters ? "Change or clear the filters." : "Buyers can rate a product once their order is delivered, or add one with Add review."}
                </div>
              </div>
            ) : (
              rows.map((r) => {
                const isAdmin = r.source === "admin";
                const hidden = r.status === "Hidden";
                return (
                  <div key={r._id} style={{ display: "flex", gap: 14, padding: "16px 18px", borderBottom: "1px solid #f1f1f1", flexWrap: "wrap", opacity: hidden ? 0.65 : 1 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, background: "#f3f4f6", flexShrink: 0, overflow: "hidden" }}>
                      {r.product?.mainImage && <img src={r.product.mainImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        {r.product?.slug ? (
                          <a href={`/products/${r.product.slug}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>{r.product.name}</a>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: 14, color: "#888" }}>{r.product?.name || "Deleted product"}</span>
                        )}
                        {r.product?.productFor && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#f1f5f9", color: "#475569" }}>{r.product.productFor.toUpperCase()}</span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: isAdmin ? "#eef2ff" : "#ecfdf3", color: isAdmin ? "#4338ca" : "#15803d" }}>
                          {isAdmin ? "Added by admin" : "Verified buyer"}
                        </span>
                        {hidden && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#fdeaea", color: "#E10600" }}>Hidden</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: "#6b7280" }}>
                        <Stars value={r.rating} />
                        <span style={{ fontWeight: 600, color: "#111" }}>{r.userName || "Buyer"}</span>
                        {!isAdmin && r.orderNumber && <span>Order {r.orderNumber}</span>}
                        <span>{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.comment ? (
                        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "#374151", lineHeight: 1.55, overflowWrap: "anywhere" }}>{r.comment}</p>
                      ) : (
                        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9ca3af" }}>Rating only, no text</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                      {isAdmin && (
                        <button type="button" style={btn} onClick={() => setModal(r)} disabled={busyId === r._id}>
                          <FaPen size={11} /> Edit
                        </button>
                      )}
                      <button type="button" style={btn} onClick={() => toggleStatus(r)} disabled={busyId === r._id}>
                        {hidden ? <><FaEye size={12} /> Show</> : <><FaEyeSlash size={12} /> Hide</>}
                      </button>
                      <button type="button" style={{ ...btn, color: "#E10600", borderColor: "#f3c6c4" }} onClick={() => remove(r)} disabled={busyId === r._id}>
                        <FaTrash size={11} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 13, color: "#666", flexWrap: "wrap", gap: 10 }}>
              <span>{total} review{total === 1 ? "" : "s"} · page {page} of {totalPages}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" style={btn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ReviewModal
          review={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
