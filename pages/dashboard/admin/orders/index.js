"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell, FaSearch, FaFileExcel, FaTrash, FaTimes } from "react-icons/fa";

export default function AdminOrdersPage() {
  const [searchInput, setSearchInput]     = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [statusFilter, setStatusFilter]   = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productFilter, setProductFilter]   = useState("");
  const [categories, setCategories]         = useState([]);
  const [products, setProducts]             = useState([]);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalCount, setTotalCount]       = useState(0);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [canViewPayments, setCanViewPayments] = useState(false);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearchQuery(searchInput.trim()); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Load categories once ──────────────────────────────────────────────────
  useEffect(() => {
    axios.get("/api/categories/list", { withCredentials: true })
      .then(res => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  // ── Load products when category changes ───────────────────────────────────
  useEffect(() => {
    setProductFilter("");
    setProducts([]);
    if (!categoryFilter) return;
    axios.get(`/api/products/admin/list?category=${categoryFilter}&limit=200`, { withCredentials: true })
      .then(res => setProducts(res.data.products || []))
      .catch(() => {});
  }, [categoryFilter]);

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (statusFilter)   params.append("status",    statusFilter);
      if (userTypeFilter) params.append("userType",   userTypeFilter);
      if (searchQuery)    params.append("search",     searchQuery);
      if (categoryFilter) params.append("category",   categoryFilter);
      if (productFilter)  params.append("product",    productFilter);

      const res = await axios.get(`/api/admin/orders?${params}`, { withCredentials: true });
      setOrders(res.data.orders || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || res.data.orders?.length || 0);
      setCanViewPayments(res.data.canViewPayments === true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [statusFilter, userTypeFilter, categoryFilter, productFilter, page, searchQuery]);

  const hasFilters = searchQuery || statusFilter || userTypeFilter || categoryFilter || productFilter;

  const clearFilters = () => {
    setSearchInput(""); setSearchQuery("");
    setStatusFilter(""); setUserTypeFilter("");
    setCategoryFilter(""); setProductFilter("");
    setPage(1);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const data = orders.map((o) => ({
      OrderNo:   o.orderNumber,
      Customer:  o.user?.name,
      UserType:  o.user?.userType,
      Total:     o.total,
      Status:    o.status,
      ...(canViewPayments ? { Payment: o.paymentMethod } : {}),
      Products:  o.items.map((i) => i.product?.name).join(", "),
      CreatedAt: new Date(o.createdAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders.xlsx");
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedOrders.length} selected orders?`)) return;
    try {
      await axios.post("/api/admin/orders/bulk-delete", { ids: selectedOrders }, { withCredentials: true });
      toast.success("Orders deleted");
      setSelectedOrders([]);
      loadOrders();
    } catch { toast.error("Failed to delete orders"); }
  };

  const allChecked = orders.length > 0 && selectedOrders.length === orders.length;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>

        {/* ── Topbar ── */}
        <nav style={{
          background: "#fff", borderBottom: "1px solid #eee",
          padding: "0 24px", height: 60, display: "flex",
          alignItems: "center", position: "sticky", top: 0, zIndex: 100,
        }}>
          <button
            onClick={() => setSidebarOpen(s => !s)}
            style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}
          >☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Orders</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <FaBell size={18} color="#888" />
          </div>
        </nav>

        <div style={{ padding: 24 }}>

          {/* ── Stats row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Orders",  value: totalCount, color: "#6366f1" },
              { label: "Delivered",     value: orders.filter(o => o.status === "Order Delivered").length, color: "#22c55e" },
              { label: "In Progress",   value: orders.filter(o => o.status === "In Progress").length, color: "#f59e0b" },
              { label: "Cancelled",     value: orders.filter(o => o.status === "Cancelled").length, color: "#ef4444" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "#fff", borderRadius: 12, padding: "16px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderLeft: `4px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>

            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
              <input
                type="text"
                placeholder="Search name or order ID..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 34, paddingRight: searchInput ? 30 : 12,
                  height: 38, border: "1px solid #e0e0e0", borderRadius: 8,
                  fontSize: 13, outline: "none", boxSizing: "border-box",
                }}
              />
              {searchInput && (
                <FaTimes
                  onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", cursor: "pointer", fontSize: 12 }}
                />
              )}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => { setPage(1); setStatusFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 160 }}
            >
              <option value="">All Status</option>
              <option value="Order Received">Order Received</option>
              <option value="Pending">Pending</option>
              <option value="Design Approved">Design Approved</option>
              <option value="Design Rejected">Design Rejected</option>
              <option value="In Progress">In Progress</option>
              <option value="In Packaging">In Packaging</option>
              <option value="Order Ready">Order Ready</option>
              <option value="Order Dispatched">Order Dispatched</option>
              <option value="Order Delivered">Order Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* User type filter */}
            <select
              value={userTypeFilter}
              onChange={e => { setPage(1); setUserTypeFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 120 }}
            >
              <option value="">All Users</option>
              <option value="partner">B2B</option>
              <option value="customer">B2C</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={e => { setPage(1); setCategoryFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 150 }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {/* Product filter (depends on category) */}
            <select
              value={productFilter}
              onChange={e => { setPage(1); setProductFilter(e.target.value); }}
              disabled={!categoryFilter}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: categoryFilter ? "#fff" : "#f9fafb", minWidth: 160, cursor: categoryFilter ? "pointer" : "not-allowed" }}
            >
              <option value="">{categoryFilter ? "All Products" : "Select category first"}</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #e0e0e0",
                  background: "#f8f8f8", cursor: "pointer", fontSize: 13, color: "#555",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <FaTimes size={11} /> Clear
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {/* Delete selected */}
              <button
                onClick={handleBulkDelete}
                disabled={!selectedOrders.length}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 8, border: "none",
                  background: selectedOrders.length ? "#ef4444" : "#fca5a5",
                  color: "#fff", cursor: selectedOrders.length ? "pointer" : "not-allowed",
                  fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <FaTrash size={11} />
                {selectedOrders.length ? `Delete (${selectedOrders.length})` : "Delete"}
              </button>

              {/* Export */}
              <button
                onClick={exportToExcel}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 8, border: "none",
                  background: "#22c55e", color: "#fff", cursor: "pointer",
                  fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <FaFileExcel size={13} /> Export
              </button>
            </div>
          </div>

          {/* ── Active filter chips ── */}
          {hasFilters && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {searchQuery && (
                <span style={{ background: "#ede9fe", color: "#6366f1", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  Search: "{searchQuery}"
                  <FaTimes style={{ cursor: "pointer" }} onClick={() => { setSearchInput(""); setSearchQuery(""); }} />
                </span>
              )}
              {statusFilter && (
                <span style={{ background: "#dbeafe", color: "#2563eb", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {statusFilter}
                  <FaTimes style={{ cursor: "pointer" }} onClick={() => { setStatusFilter(""); setPage(1); }} />
                </span>
              )}
              {userTypeFilter && (
                <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {userTypeFilter === "partner" ? "B2B" : "B2C"}
                  <FaTimes style={{ cursor: "pointer" }} onClick={() => { setUserTypeFilter(""); setPage(1); }} />
                </span>
              )}
              {categoryFilter && (
                <span style={{ background: "#fef3c7", color: "#b45309", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {categories.find(c => c._id === categoryFilter)?.name || "Category"}
                  <FaTimes style={{ cursor: "pointer" }} onClick={() => { setCategoryFilter(""); setProductFilter(""); setPage(1); }} />
                </span>
              )}
              {productFilter && (
                <span style={{ background: "#fdf2f8", color: "#9d174d", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {products.find(p => p._id === productFilter)?.name || "Product"}
                  <FaTimes style={{ cursor: "pointer" }} onClick={() => { setProductFilter(""); setPage(1); }} />
                </span>
              )}
            </div>
          )}

          {/* ── Table card ── */}
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>

            {/* Table header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                Orders List{" "}
                {!loading && <span style={{ color: "#aaa", fontWeight: 400, fontSize: 13 }}>({orders.length} shown)</span>}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                Loading orders...
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                      <th style={thStyle}>
                        <input type="checkbox" checked={allChecked}
                          onChange={e => setSelectedOrders(e.target.checked ? orders.map(o => o._id) : [])} />
                      </th>
                      {["Order No", "Products", "Customer", "Type", "Total", "Status", ...(canViewPayments ? ["Payment"] : []), "Date", "Actions"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length > 0 ? orders.map((o, idx) => (
                      <tr key={o._id}
                        style={{ borderBottom: "1px solid #f5f5f5", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}
                      >
                        <td style={tdStyle}>
                          <input type="checkbox" checked={selectedOrders.includes(o._id)}
                            onChange={() => setSelectedOrders(prev =>
                              prev.includes(o._id) ? prev.filter(id => id !== o._id) : [...prev, o._id]
                            )} />
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 600, color: "#6366f1", whiteSpace: "nowrap" }}>
                          #{o.orderNumber}
                        </td>

                        <td style={{ ...tdStyle, maxWidth: 240 }}>
                          {o.items?.map((item, i) => (
                            <div key={i} style={{ marginBottom: i < o.items.length - 1 ? 6 : 0 }}>
                              <div style={{ fontWeight: 500, color: "#333" }}>{item.product?.name || "Product"}</div>
                              <div style={{ color: "#999", fontSize: 12 }}>Qty: {item.quantity} × ₹{item.price}</div>
                            </div>
                          ))}
                        </td>

                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{o.user?.name || "—"}</td>

                        <td style={tdStyle}>
                          {o.user?.userType === "partner"
                            ? <span style={badge("#dbeafe", "#1d4ed8")}>B2B</span>
                            : o.user?.userType === "customer"
                              ? <span style={badge("#dcfce7", "#15803d")}>B2C</span>
                              : "—"}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 600 }}>₹{o.total}</td>

                        <td style={tdStyle}>
                          <span style={statusBadge(o.status)}>{o.status}</span>
                        </td>

                        {canViewPayments && <td style={tdStyle}>{o.paymentMethod || "—"}</td>}

                        <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#888" }}>
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>

                        <td style={tdStyle}>
                          <Link href={`/dashboard/admin/orders/${o._id}`}
                            style={{
                              padding: "5px 12px", borderRadius: 6, border: "1px solid #6366f1",
                              color: "#6366f1", fontSize: 12, fontWeight: 500,
                              textDecoration: "none", whiteSpace: "nowrap",
                            }}>
                            View / Update
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                          {hasFilters ? "No orders match your filters." : "No orders found."}
                          {hasFilters && (
                            <div>
                              <button onClick={clearFilters}
                                style={{ marginTop: 10, background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>
                                Clear Filters
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: page === 1 ? "#f5f5f5" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>
                  ← Previous
                </button>
                <span style={{ fontSize: 13, color: "#888" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: page === totalPages ? "#f5f5f5" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13 }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const thStyle = {
  padding: "10px 14px", textAlign: "left", fontSize: 12,
  fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.4px",
};
const tdStyle = { padding: "12px 14px", verticalAlign: "middle" };

const badge = (bg, color) => ({
  background: bg, color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
});

const statusBadge = (status) => {
  const map = {
    "Order Received":   ["#dbeafe", "#1d4ed8"],
    "Pending":          ["#fef9c3", "#854d0e"],
    "Design Approved":  ["#dcfce7", "#15803d"],
    "Design Rejected":  ["#fee2e2", "#b91c1c"],
    "In Progress":      ["#fef3c7", "#b45309"],
    "In Packaging":     ["#f3f4f6", "#374151"],
    "Order Ready":      ["#ede9fe", "#6d28d9"],
    "Order Dispatched": ["#dbeafe", "#1e40af"],
    "Order Delivered":  ["#dcfce7", "#166534"],
    "Cancelled":        ["#fee2e2", "#991b1b"],
  };
  const [bg, color] = map[status] || ["#f3f4f6", "#374151"];
  return { background: bg, color, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" };
};









// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import * as XLSX from "xlsx";

// import { toast } from "react-hot-toast";
// import { useRouter } from "next/navigation";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import {
//   FaBell,
//   FaClipboardList,
//   FaShoppingCart,
//   FaTruck,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaBoxOpen,
// } from "react-icons/fa";

// export default function AdminOrdersPage() {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedOrders, setSelectedOrders] = useState([]);

//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [statusFilter, setStatusFilter] = useState("");
//   const [userTypeFilter, setUserTypeFilter] = useState(""); // NEW
//   const [page, setPage] = useState(1); // NEW
//   const [totalPages, setTotalPages] = useState(1); // NEW

//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const router = useRouter();

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const exportToExcel = () => {
//     const data = orders.map((o) => ({
//       OrderNo: o.orderNumber,
//       Customer: o.user?.name,
//       UserType: o.user?.userType,
//       Total: o.total,
//       Status: o.status,
//       Payment: o.paymentMethod,
//       Products: o.items.map((i) => i.product?.name).join(", "),
//       CreatedAt: new Date(o.createdAt).toLocaleString(),
//     }));

//     const ws = XLSX.utils.json_to_sheet(data);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Orders");
//     XLSX.writeFile(wb, "orders.xlsx");
//   };

//   const loadOrders = async () => {
//     try {
//       // const res = await axios.get(
//       //   `/api/admin/orders?page=${page}${
//       //     statusFilter ? `&status=${statusFilter}` : ""
//       //   }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}`,
//       //   { withCredentials: true }
//       // );

//       const res = await axios.get(
//         `/api/admin/orders?page=${page}${
//           statusFilter ? `&status=${statusFilter}` : ""
//         }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}${
//           searchQuery ? `&search=${searchQuery}` : ""
//         }`,
//         { withCredentials: true }
//       );

//       setOrders(res.data.orders || []);
//       setTotalPages(res.data.totalPages || 1);
//     } catch (err) {
//       console.error("Admin orders error:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOrders();
//   }, [statusFilter, userTypeFilter, page, searchQuery]);

//   if (loading)
//     return <div className="p-5 text-center fw-semibold">Loading orders...</div>;

//   const totalOrders = orders.length;
//   const delivered = orders.filter((o) => o.status === "Order Delivered").length;
//   const received = orders.filter((o) => o.status === "Order Received").length;
//   const inProgress = orders.filter((o) => o.status === "In Progress").length;

//   // Detect B2B / B2C
//   const getUserTypeLabel = (u) =>
//     u?.userType === "partner" ? (
//       <span className="badge bg-primary">B2B</span>
//     ) : u?.userType === "customer" ? (
//       <span className="badge bg-success">B2C</span>
//     ) : (
//       "—"
//     );

//   const handleBulkDelete = async () => {
//     if (!confirm("Are you sure you want to delete selected orders?")) return;

//     try {
//       await axios.post(
//         "/api/admin/orders/bulk-delete",
//         { ids: selectedOrders },
//         { withCredentials: true }
//       );

//       toast.success("Orders deleted successfully");
//       setSelectedOrders([]);
//       loadOrders();
//     } catch (err) {
//       toast.error("Failed to delete orders");
//     }
//   };

//   return (
//     <div className="d-flex bg-light min-vh-100">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main Area */}
//       <div className="main-area">
//         {/* Navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           {/* <h5 className="dashboard-main-h">Admin Dashboard</h5> */}
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3 text-muted" size={20} />
//           </div>
//         </nav>

//         {/* Page Content */}
//         <div className="p-4">
//           <div className="d-flex justify-content-between align-items-center mb-4">
//             <h4 className="fw-bold mb-0">Orders Overview</h4>

//             <input
//               type="text"
//               className="form-control w-auto shadow-sm"
//               placeholder="Search by name or order ID"
//               value={searchQuery}
//               onChange={(e) => {
//                 setPage(1);
//                 setSearchQuery(e.target.value);
//               }}
//               style={{ minWidth: "220px" }}
//             />

//             <div className="d-flex gap-3">
//               {/* STATUS FILTER */}
//               <select
//                 className="form-select w-auto shadow-sm"
//                 value={statusFilter}
//                 onChange={(e) => {
//                   setPage(1);
//                   setStatusFilter(e.target.value);
//                 }}
//               >
//                 <option value="">All Status</option>
//                 <option value="Order Received">Order Received</option>
//                 <option value="Design Approved">Design Approved</option>
//                 <option value="Design Rejected">Design Rejected</option>
//                 <option value="In Progress">In Progress</option>
//                 <option value="In Packaging">In Packaging</option>
//                 <option value="Order Dispatched">Order Dispatched</option>
//                 <option value="Order Delivered">Order Delivered</option>
//               </select>

//               {/* USER TYPE FILTER */}
//               <select
//                 className="form-select w-auto shadow-sm"
//                 value={userTypeFilter}
//                 onChange={(e) => {
//                   setPage(1);
//                   setUserTypeFilter(e.target.value);
//                 }}
//               >
//                 <option value="">All Users</option>
//                 <option value="partner">B2B</option>
//                 <option value="customer">B2C</option>
//               </select>
//             </div>

//             <button
//               className="btn btn-danger btn-sm"
//               disabled={!selectedOrders.length}
//               onClick={handleBulkDelete}
//             >
//               Delete Selected
//             </button>

//             <button className="btn btn-success btn-sm" onClick={exportToExcel}>
//               Export Excel
//             </button>
//           </div>

//           {/* Orders Table */}
//           <div className="card shadow-sm border-0">
//             <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
//               <h6 className="fw-bold mb-0">Orders List</h6>
//               {/* <button onClick={loadOrders} className="btn btn-sm btn-outline-secondary">
//                 Refresh
//               </button> */}
//             </div>

//             <div className="table-responsive">
//               <table className="table table-hover align-middle mb-0">
//                 <thead className="table-light">
//                   <tr>
//                     <th>
//                       <input
//                         type="checkbox"
//                         checked={
//                           selectedOrders.length === orders.length &&
//                           orders.length > 0
//                         }
//                         onChange={(e) =>
//                           setSelectedOrders(
//                             e.target.checked ? orders.map((o) => o._id) : []
//                           )
//                         }
//                       />
//                     </th>

//                     <th>Order No</th>
//                     <th>Products</th>
//                     <th>Customer</th>
//                     <th>Type</th>
//                     <th>Total</th>
//                     <th>Status</th>
//                     <th>Payment</th>
//                     <th>Date</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {orders.length > 0 ? (
//                     orders.map((o) => (
//                       <tr key={o._id}>
//                         <td>
//                           <input
//                             type="checkbox"
//                             checked={selectedOrders.includes(o._id)}
//                             onChange={() =>
//                               setSelectedOrders((prev) =>
//                                 prev.includes(o._id)
//                                   ? prev.filter((id) => id !== o._id)
//                                   : [...prev, o._id]
//                               )
//                             }
//                           />
//                         </td>

//                         <td className="fw-semibold">#{o.orderNumber}</td>

//                         <td style={{ maxWidth: "320px" }}>
//                           {o.items?.map((item, idx) => (
//                             <div
//                               key={idx}
//                               className="d-flex align-items-center mb-2"
//                               style={{ gap: "10px" }}
//                             >
//                               {/* PRODUCT IMAGE */}
//                               {/* <img
//                                   src={
//                                     item.product?.images?.[0]
//                                       ? item.product.images[0]
//                                       : "/no-image.png"
//                                   }
//                                   alt={item.product?.name}
//                                   style={{
//                                     width: "40px",
//                                     height: "40px",
//                                     objectFit: "cover",
//                                     borderRadius: "6px",
//                                     border: "1px solid #ddd",
//                                   }}
//                                 /> */}

//                               {/* PRODUCT INFO */}
//                               <div style={{ lineHeight: "1.2" }}>
//                                 <div className="fw-semibold small">
//                                   {item.product?.name || "Product"}
//                                 </div>
//                                 <div className="text-muted small">
//                                   Qty: {item.quantity} × ₹{item.price}
//                                 </div>
//                               </div>
//                             </div>
//                           ))}
//                         </td>

//                         <td>{o.user?.name || "—"}</td>
//                         <td>{getUserTypeLabel(o.user)}</td>
//                         <td>₹{o.total}</td>
//                         <td>
//                           <span
//                             className={`badge rounded-pill bg-${getStatusColor(
//                               o.status
//                             )}`}
//                           >
//                             {o.status}
//                           </span>
//                         </td>
//                         <td>{o.paymentMethod || "—"}</td>
//                         <td>
//                           {new Date(o.createdAt).toLocaleDateString("en-IN", {
//                             day: "2-digit",
//                             month: "short",
//                             year: "numeric",
//                           })}
//                         </td>
//                         <td>
//                           <Link
//                             href={`/dashboard/admin/orders/${o._id}`}
//                             className="btn btn-sm btn-outline-primary"
//                           >
//                             View / Update
//                           </Link>
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="8" className="text-center text-muted py-4">
//                         No orders found
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* PAGINATION */}
//             <div className="d-flex justify-content-between p-3">
//               <button
//                 className="btn btn-outline-secondary"
//                 disabled={page === 1}
//                 onClick={() => setPage((p) => p - 1)}
//               >
//                 ← Previous
//               </button>

//               <span className="fw-semibold">
//                 Page {page} of {totalPages}
//               </span>

//               <button
//                 className="btn btn-outline-secondary"
//                 disabled={page === totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next →
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function getStatusColor(status) {
//   switch (status) {
//     case "Order Received":
//       return "info";
//     case "Design Approved":
//       return "success";
//     case "Design Rejected":
//       return "danger";
//     case "In Progress":
//       return "warning";
//     case "In Packaging":
//       return "secondary";
//     case "Order Dispatched":
//       return "primary";
//     case "Order Delivered":
//       return "success";
//     default:
//       return "dark";
//   }
// }
