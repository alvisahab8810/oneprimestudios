"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import Offcanvas from "@/components/header/Offcanvas";
import {
  FiSearch, FiSliders, FiX, FiChevronRight,
  FiPackage, FiCalendar, FiTag, FiLayers,
  FiChevronLeft, FiChevronRight as FiChevRight,
} from "react-icons/fi";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  "All", "Order Received", "Design Approved", "Design Rejected",
  "In Progress", "Order Ready", "In Packaging", "Order Dispatched", "Order Delivered",
];

const STATUS_CONFIG = {
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

export default function OrdersListPage() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("All");
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [productFilter, setProductFilter]   = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [parentFilter, setParentFilter]     = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [childCategories, setChildCategories]   = useState([]);
  const [filteredChildren, setFilteredChildren] = useState([]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          axios.get("/api/products?limit=200", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/categories"),
        ]);
        const products = prodRes.data?.products || prodRes.data?.data || [];
        setAllProducts(products);
        const cats = catRes.data || [];
        setParentCategories(cats.filter(c => !c.parent));
        setChildCategories(cats.filter(c => c.parent));
      } catch {}
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    if (parentFilter) {
      setFilteredChildren(childCategories.filter(c =>
        String(c.parent) === String(parentFilter) || c.parent?._id === parentFilter
      ));
      setCategoryFilter("");
    } else {
      setFilteredChildren(childCategories);
    }
  }, [parentFilter, childCategories]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (activeTab !== "All") params.append("status", activeTab);
      if (search)         params.append("search", search);
      if (productFilter)  params.append("productId", productFilter);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (parentFilter && !categoryFilter) params.append("parentCategoryId", parentFilter);
      if (dateFrom)       params.append("dateFrom", dateFrom);
      if (dateTo)         params.append("dateTo", dateTo);

      const res = await axios.get(`/api/orders?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, productFilter, categoryFilter, parentFilter, dateFrom, dateTo, page]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    const h = () => loadOrders();
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [loadOrders]);

  const clearFilters = () => {
    setSearchInput(""); setSearch("");
    setProductFilter(""); setCategoryFilter("");
    setParentFilter(""); setDateFrom(""); setDateTo("");
    setPage(1);
  };

  const hasFilters = search || productFilter || categoryFilter || parentFilter || dateFrom || dateTo;

  const getProductTitle = (order) => {
    if (!order?.items?.length) return "Order";
    const first = order.items[0]?.product?.name || "Product";
    return order.items.length === 1 ? first : `${first} +${order.items.length - 1} more`;
  };

  const cfg = (status) => STATUS_CONFIG[status] || { dot: "#9ca3af", bg: "#f9fafb", text: "#6b7280" };

  return (
    <>
      <Topbar />
      <Offcanvas />

      <div style={{ minHeight: "100vh", background: "#f7f7f5", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>Dashboard</p>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#111", letterSpacing: "-0.5px" }}>My Orders</h1>
          </div>

          {/* ── Search + Filter row ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <FiSearch size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search product name or order ID..."
                style={{
                  width: "100%", height: 44, paddingLeft: 40, paddingRight: searchInput ? 36 : 14,
                  border: "1.5px solid #e5e5e5", borderRadius: 10, fontSize: 14,
                  outline: "none", background: "#fff", boxSizing: "border-box",
                  color: "#111", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#111"}
                onBlur={e => e.target.style.borderColor = "#e5e5e5"}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(""); setSearch(""); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}>
                  <FiX size={14} />
                </button>
              )}
            </div>

            <button onClick={() => setShowFilters(s => !s)}
              style={{
                height: 44, padding: "0 18px", borderRadius: 10,
                border: `1.5px solid ${showFilters || hasFilters ? "#111" : "#e5e5e5"}`,
                background: showFilters || hasFilters ? "#111" : "#fff",
                color: showFilters || hasFilters ? "#fff" : "#555",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
                transition: "all 0.2s",
              }}>
              <FiSliders size={14} />
              Filters
              {hasFilters && (
                <span style={{ background: "#fff", color: "#111", borderRadius: 20, width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {[search,productFilter,categoryFilter,parentFilter,dateFrom,dateTo].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* ── Filter Panel ── */}
          {showFilters && (
            <div style={{ background: "#fff", border: "1.5px solid #e5e5e5", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>

                <div>
                  <label style={lbl}><FiLayers size={11} style={{ marginRight: 5 }} />Parent Category</label>
                  <select value={parentFilter} onChange={e => { setParentFilter(e.target.value); setPage(1); }} style={sel}>
                    <option value="">All Categories</option>
                    {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={lbl}><FiTag size={11} style={{ marginRight: 5 }} />Sub Category</label>
                  <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} style={sel}>
                    <option value="">All Sub Categories</option>
                    {filteredChildren.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                {/* <div>
                  <label style={lbl}><FiPackage size={11} style={{ marginRight: 5 }} />Product</label>
                  <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1); }} style={sel}>
                    <option value="">All Products</option>
                    {allProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div> */}

                <div>
                  <label style={lbl}><FiCalendar size={11} style={{ marginRight: 5 }} />From Date</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={sel} />
                </div>

                <div>
                  <label style={lbl}><FiCalendar size={11} style={{ marginRight: 5 }} />To Date</label>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={sel} />
                </div>
              </div>

              {hasFilters && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0f0f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active:</span>
                  {search && <FilterChip label={`"${search}"`} onRemove={() => { setSearchInput(""); setSearch(""); }} />}
                  {parentFilter && <FilterChip label={parentCategories.find(c => c._id === parentFilter)?.name} onRemove={() => { setParentFilter(""); setPage(1); }} />}
                  {categoryFilter && <FilterChip label={filteredChildren.find(c => c._id === categoryFilter)?.name} onRemove={() => { setCategoryFilter(""); setPage(1); }} />}
                  {productFilter && <FilterChip label={allProducts.find(p => p._id === productFilter)?.name} onRemove={() => { setProductFilter(""); setPage(1); }} />}
                  {dateFrom && <FilterChip label={`From ${dateFrom}`} onRemove={() => { setDateFrom(""); setPage(1); }} />}
                  {dateTo && <FilterChip label={`To ${dateTo}`} onRemove={() => { setDateTo(""); setPage(1); }} />}
                  <button onClick={clearFilters}
                    style={{ marginLeft: "auto", background: "none", border: "1px solid #e5e5e5", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#555", cursor: "pointer", fontWeight: 500 }}>
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Status tabs ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
            {STATUS_TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
                style={{
                  padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: "1.5px solid",
                  borderColor: activeTab === tab ? "#111" : "#e5e5e5",
                  background: activeTab === tab ? "#111" : "#fff",
                  color: activeTab === tab ? "#fff" : "#6b7280",
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  letterSpacing: activeTab === tab ? "-0.01em" : "0",
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── Results line ── */}
          {!loading && (
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, fontWeight: 500 }}>
              {total} order{total !== 1 ? "s" : ""}
              {activeTab !== "All" && <> · <span style={{ color: "#111" }}>{activeTab}</span></>}
              {hasFilters && <> · <span style={{ color: "#111" }}>Filtered</span></>}
            </div>
          )}

          {/* ── Orders ── */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, height: 130, border: "1.5px solid #f0f0f0", animation: "shimmer 1.4s ease-in-out infinite" }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ background: "#fff", border: "1.5px solid #e5e5e5", borderRadius: 16, padding: "64px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FiPackage size={22} color="#9ca3af" />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "#111" }}>No orders found</h3>
              <p style={{ margin: "0 0 20px", color: "#9ca3af", fontSize: 14 }}>
                {hasFilters ? "Try adjusting your filters" : "You haven't placed any orders yet"}
              </p>
              {hasFilters ? (
                <button onClick={clearFilters}
                  style={{ background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Clear Filters
                </button>
              ) : (
                <Link href="/products"
                  style={{ background: "#111", color: "#fff", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
                  Browse Products
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {orders.map(o => {
                const c = cfg(o.status);
                return (
                  <div key={o._id}
                    style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 14, padding: "20px 22px", transition: "border-color 0.2s, transform 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.transform = "none"; }}
                  >
                    {/* Row 1: title + status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getProductTitle(o)}
                        </h4>
                        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
                          {o.orderNumber} &nbsp;&middot;&nbsp;
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: c.bg, color: c.text,
                        borderRadius: 6, padding: "4px 10px",
                        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                        {o.status}
                      </span>
                    </div>

                    {/* Row 2: product chips */}
                    {o.items?.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        {o.items.slice(0, 3).map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f7f7f5", borderRadius: 8, padding: "6px 10px", border: "1px solid #eeeeec" }}>
                            {item.product?.mainImage ? (
                              <img src={item.product.mainImage} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 6 }} />
                            ) : (
                              <div style={{ width: 30, height: 30, borderRadius: 6, background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FiPackage size={13} color="#9ca3af" />
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.product?.name || "Product"}
                              </div>
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>Qty {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                        {o.items.length > 3 && (
                          <div style={{ display: "flex", alignItems: "center", background: "#f7f7f5", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#9ca3af", border: "1px solid #eeeeec" }}>
                            +{o.items.length - 3} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 3: price + action */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid #f5f5f3" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>₹{o.total}</span>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{o.paymentMethod}</span>
                      </div>
                      <Link href={`/orders/${o._id}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: "#111", color: "#fff",
                          borderRadius: 8, padding: "9px 16px",
                          fontSize: 13, fontWeight: 600, textDecoration: "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#333"}
                        onMouseLeave={e => e.currentTarget.style.background = "#111"}
                      >
                        View Details <FiChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, color: page === 1 ? "#d1d5db" : "#111" }}>
                <FiChevronLeft size={14} /> Previous
              </button>
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, color: page === totalPages ? "#d1d5db" : "#111" }}>
                Next <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (max-width: 600px) {
          h1 { font-size: 24px !important; }
        }
      `}</style>
    </>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "#f7f7f5", border: "1px solid #e5e5e5",
      borderRadius: 6, padding: "4px 10px",
      fontSize: 12, fontWeight: 500, color: "#374151",
    }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9ca3af" }}>
        <FiX size={11} />
      </button>
    </span>
  );
}

const lbl = { display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 6 };
const sel = { width: "100%", padding: "9px 11px", border: "1.5px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", color: "#111", boxSizing: "border-box", cursor: "pointer" };



// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import Offcanvas from "@/components/header/Offcanvas";

// export default function OrdersListPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("All");


//   const STATUS_TABS = [
//   "All",
//   "Design Approved",
//   "Design Rejected",
//   "In Progress",
//   "Order Ready",
//   "In Packaging",
//   "Order Dispatched",
//   "Order Delivered",
// ];


// const statusClassMap = {
//   "Design Approved": "progress",
//   "Design Rejected": "rejected",
//   "In Progress": "progress",
//   "Order Ready": "progress",
//   "In Packaging": "progress",
//   "Order Dispatched": "progress",
//   "Order Delivered": "completed",
// };



//   // ✅ Fetch Orders
//   const loadOrders = async () => {
//     try {
//       const token =
//         typeof window !== "undefined" ? localStorage.getItem("token") : null;
//       const res = await axios.get("/api/orders", {
//         headers: token ? { Authorization: `Bearer ${token}` } : {},
//         withCredentials: true,
//       });

//       setOrders(res.data.orders || []);
//     } catch (err) {
//       console.error("❌ Order load error:", err.response?.data || err.message);
//       toast.error("Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOrders();

//     // ✅ Auto refresh when window regains focus (keeps in sync with admin updates)
//     const handleFocus = () => loadOrders();
//     window.addEventListener("focus", handleFocus);
//     return () => window.removeEventListener("focus", handleFocus);
//   }, []);

//   // ✅ Map backend status to frontend display category


// const tabs = STATUS_TABS;

//  const counts = {
//   All: orders.length,
// };

// STATUS_TABS.forEach((status) => {
//   if (status === "All") return;
//   counts[status] = orders.filter((o) => o.status === status).length;
// });


// const filteredOrders =
//   activeTab === "All"
//     ? orders
//     : orders.filter((o) => o.status === activeTab);


//   const getOrderProductTitle = (order) => {
//     if (!order?.items || order.items.length === 0) return "Order";

//     const firstItem = order.items[0];
//     const firstName = firstItem.product?.name || "Product";

//     if (order.items.length === 1) return firstName;

//     return `${firstName} + ${order.items.length - 1} more`;
//   };

//   if (loading)
//     return <div className="container py-5 text-center">Loading...</div>;

//   return (
//     <>
//       <Topbar />
//       <Offcanvas />

//       <div className="orders-page container padding-top-40 ">
//         <h3 className="mb-4 fw-semibold">My Orders</h3>

//         {/* ✅ Tabs */}
//         <div className="tabs mb-4 d-flex flex-wrap gap-2">
//           {tabs.map((tab) => (
//             <button
//               key={tab}
//               className={`tab-btn ${activeTab === tab ? "active" : ""}`}
//               onClick={() => setActiveTab(tab)}
//             >
//               {tab} <span className="tab-count">{counts[tab] ?? 0}</span>
//             </button>
//           ))}
//         </div>

//         {/* ✅ Orders */}
//         {filteredOrders.length === 0 ? (
//           <div className="empty-state text-center py-5 empty-wishlist-area">
//             {/* <img
//               src="/assets/images/empty-cart.png"
//               alt="Empty Cart"
//             /> */}
//             <img
//               src="/assets/images/empty-cart.png"
//               alt="No orders"
//               width={120}
//               className="mb-3 opacity-75"
//             />
//             <h5 className="fw-semibold mb-2">No orders found for "{activeTab}"</h5>
//             <p className="text-muted small mb-3">
//               Looks like you don't have any {activeTab.toLowerCase()} orders
//               yet.
//             </p>
//             <Link href="/products" className="continue-shoppin-btn">
//               Browse Products
//             </Link>
//           </div>
//         ) : (
//           <div className="order-grid">
//          {filteredOrders.map((o) => {
//   const badgeClass = statusClassMap[o.status] || "progress";

//   return (
//     <div key={o._id} className="order-card mb-3">
//       <div className="order-header d-flex justify-content-between align-items-start">
//         <div>
//           <h6 className="fw-semibold mb-1">
//             {getOrderProductTitle(o)}
//           </h6>

//           <div className="small text-muted">
//             {new Date(o.createdAt).toLocaleString()}
//           </div>
//         </div>

//         {/* ✅ STATUS BADGE (FIXED) */}
//         <span className={`status-badge ${badgeClass}`}>
//           {o.status}
//         </span>
//       </div>

//       <div className="order-body mt-3">
//         <div className="fw-semibold fs-5">₹{o.total}</div>
//         <div className="small text-muted">
//           Payment: {o.paymentMethod}
//         </div>
//       </div>

//       <div className="order-footer d-flex justify-content-end mt-3">
//         <Link href={`/orders/${o._id}`} className="view-link">
//           View Order Details →
//         </Link>
//       </div>
//     </div>
//   );
// })}

//           </div>
//         )}
//       </div>

//       <Footer />

//       {/* ✅ Modern styles */}
//       <style jsx>{`
//         .tabs {
//           border-bottom: 1px solid #eee;
//           padding-bottom: 8px;
//         }
//         .tab-btn {
//           border: 1px solid #ddd;
//           background: #fff;
//           padding: 6px 18px;
//           border-radius: 8px;
//           font-size: 15px;
//           transition: 0.2s ease;
//           position: relative;
//           font-weight: 500;
//           display: flex;
//           align-items: center;
//           gap: 6px;
//         }
//         .tab-btn.active {
//           background: #333;
//           color: #fff;
//           border-color: transparent;
//           box-shadow: 0 2px 6px rgba(114, 9, 183, 0.3);
//         }
//         .tab-count {
//           background: #f3f0ff;
//           color: #333;
//           padding: 2px 8px;
//           border-radius: 12px;
//           font-size: 13px;
//           font-weight: 600;
//         }
//         .tab-btn.active .tab-count {
//           background: rgba(255, 255, 255, 0.25);
//           color: #fff;
//         }

//         .order-card {
//           background: #fff;
//           border-radius: 12px;
//           box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
//           padding: 18px;
//           transition: 0.2s ease;
//         }
//         .order-card:hover {
//           transform: translateY(-2px);
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//         }

//         .status-badge {
//           border-radius: 20px;
//           font-size: 13px;
//           padding: 3px 12px;
//           font-weight: 500;
//           text-transform: capitalize;
//         }
//         .status-badge.progress {
//           background: #e9e6ff;
//           color: #333;
//           border: 1px solid #d5ceff;
//         }
//         .status-badge.completed {
//           background: #e7f9ee;
//           color: #128a2e;
//           border: 1px solid #b4e1c1;
//         }
//         .status-badge.rejected {
//           background: #fff3cd;
//           color: #856404;
//           border: 1px solid #ffeeba;
//         }

//         .view-link {
//           font-weight: 500;
//           color: #333;
//           text-decoration: none;
//         }
//         .view-link:hover {
//           text-decoration: underline;
//         }

//         .empty-state img {
//           max-width: 140px;
//           opacity: 0.8;
//         }

//         @media (max-width: 576px) {
//           .tab-btn {
//             flex: 1 1 auto;
//             justify-content: center;
//           }
//           .order-card {
//             padding: 14px;
//           }
//         }
//       `}</style>
//     </>
//   );
// }
