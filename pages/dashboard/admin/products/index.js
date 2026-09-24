"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import AdminTopbar from "@/components/admin-panel/AdminTopbar";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiImage,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { getStock, getMinOrderQty, isOutOfStock } from "@/lib/stockRules";

const EMPTY_FILTERS = { search: "", status: "", category: "", productFor: "", stock: "" };

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const count = (n) => Number(n || 0).toLocaleString("en-IN");

export default function AdminProductList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  // Products whose image URL did not load, so the row shows a placeholder instead
  const [brokenImages, setBrokenImages] = useState({});

  // The search box is debounced, so typing does not fire a request per keystroke
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState(null);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/products/admin/list", {
        params: { ...filters, page },
      });
      setProducts(data.data || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      setSummary(data.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get("/api/categories/list");
      setCategories(data.data || []);
    } catch {
      /* the category filter simply stays empty */
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts(1); // any filter change starts again from the first page
  }, [filters]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const setStockFilter = (value) =>
    setFilters((f) => ({ ...f, stock: f.stock === value ? "" : value }));

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
  };

  const hasFilters = useMemo(
    () => Object.values(filters).some(Boolean),
    [filters]
  );

  const toggleStatus = async (id, newStatus) => {
    setBusyId(id);
    try {
      await axios.put(`/api/products/status/${id}`, { status: newStatus });
      toast.success(newStatus === "published" ? "Product published" : "Moved to draft");
      fetchProducts(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the status");
    } finally {
      setBusyId("");
    }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await axios.delete(`/api/products/admin/delete/${id}`);
      toast.success("Product deleted");
      // Stepping back a page keeps the list from landing on an empty one
      const lastOnPage = products.length === 1 && pagination.page > 1;
      fetchProducts(lastOnPage ? pagination.page - 1 : pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the product");
    } finally {
      setBusyId("");
    }
  };

  const cards = summary
    ? [
        { key: "", label: "Products", value: summary.totalProducts, tone: "slate" },
        { key: null, label: "Units in stock", value: summary.totalUnits, tone: "blue" },
        { key: "in", label: "In stock", value: summary.inStock, tone: "green" },
        { key: "out", label: "Out of stock", value: summary.outOfStock, tone: "red" },
        { key: "low", label: "Below min order qty", value: summary.lowStock, tone: "amber" },
      ]
    : [];

  const perPage = 10;
  const first = pagination.total ? (pagination.page - 1) * perPage + 1 : 0;
  const last = Math.min(pagination.page * perPage, pagination.total || 0);

  // A short window of page numbers, so 40 pages do not turn into 40 buttons
  const pageWindow = useMemo(() => {
    const total = pagination.pages || 1;
    const current = pagination.page || 1;
    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i).filter((n) => n <= total);
  }, [pagination.pages, pagination.page]);

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <AdminTopbar onToggleSidebar={toggleSidebar} />

        <div className="container-fluid p-4 products-page">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <div>
              <h1 className="dashboard-main-h mb-0">Products</h1>
              <p className="page-sub mb-0">
                {summary
                  ? `${count(summary.totalProducts)} product${summary.totalProducts === 1 ? "" : "s"} · ${count(summary.totalUnits)} units in stock`
                  : "Loading your catalogue…"}
              </p>
            </div>
            <Link href="/dashboard/admin/add-product" className="btn btn-primary d-inline-flex align-items-center gap-2">
              <FiPlus /> Add Product
            </Link>
          </div>

          {/* ── Stock summary — each tile is also a filter ──────────────── */}
          {summary && (
            <div className="stat-grid mt-3">
              {cards.map((card) => {
                const clickable = card.key !== null;
                const active = clickable && card.key !== "" && filters.stock === card.key;
                return (
                  <button
                    key={card.label}
                    type="button"
                    disabled={!clickable}
                    onClick={() => (card.key === "" ? clearFilters() : setStockFilter(card.key))}
                    className={`stat-card tone-${card.tone} ${active ? "is-active" : ""} ${clickable ? "" : "is-static"}`}
                  >
                    <span className="stat-label">{card.label}</span>
                    <span className="stat-value">{count(card.value)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Toolbar ────────────────────────────────────────────────── */}
          <div className="panel mt-3">
            <div className="toolbar">
              <div className="search-wrap">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Search by product name"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button type="button" className="search-clear" onClick={() => setSearchInput("")} aria-label="Clear search">
                    <FiX />
                  </button>
                )}
              </div>

              <select name="status" className="form-select tool-select" value={filters.status} onChange={handleFilterChange}>
                <option value="">All status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>

              <select name="category" className="form-select tool-select" value={filters.category} onChange={handleFilterChange}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>

              <select name="productFor" className="form-select tool-select" value={filters.productFor} onChange={handleFilterChange}>
                <option value="">All types</option>
                <option value="b2b">B2B</option>
                <option value="b2c">B2C</option>
                <option value="both">Both</option>
              </select>

              <select name="stock" className="form-select tool-select" value={filters.stock} onChange={handleFilterChange}>
                <option value="">Any stock</option>
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
                <option value="low">Below min order qty</option>
              </select>

              {hasFilters && (
                <button type="button" className="btn btn-link btn-clear" onClick={clearFilters}>
                  <FiX /> Clear
                </button>
              )}
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            <div className="table-responsive">
              <table className="table product-table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 72 }}>Image</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-end">Price</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Stock</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`s${i}`} className="skeleton-row">
                        <td><span className="sk sk-thumb" /></td>
                        <td><span className="sk sk-line w-75" /></td>
                        <td><span className="sk sk-line w-50" /></td>
                        <td className="text-end"><span className="sk sk-line w-50 ms-auto" /></td>
                        <td><span className="sk sk-line w-50" /></td>
                        <td><span className="sk sk-pill" /></td>
                        <td><span className="sk sk-pill" /></td>
                        <td className="text-end"><span className="sk sk-line w-75 ms-auto" /></td>
                      </tr>
                    ))
                  ) : products.length > 0 ? (
                    products.map((p) => {
                      const mrp = Number(p.basePrice) || 0;
                      const sale = Number(p.salePrice) || 0;
                      // A sale price only counts when it is actually below the MRP
                      const discounted = sale > 0 && mrp > sale;
                      const price = sale > 0 ? sale : mrp;
                      const off = discounted ? Math.round(((mrp - sale) / mrp) * 100) : 0;

                      const out = isOutOfStock(p);
                      const units = getStock(p);
                      const moq = getMinOrderQty(p);
                      const belowMoq = !out && units < moq;

                      return (
                        <tr key={p._id} className={busyId === p._id ? "is-busy" : ""}>
                          <td>
                            {p.mainImage && !brokenImages[p._id] ? (
                              <img
                                src={p.mainImage}
                                className="thumb"
                                alt={p.name}
                                onError={() =>
                                  setBrokenImages((b) => ({ ...b, [p._id]: true }))
                                }
                              />
                            ) : (
                              <span className="thumb thumb-empty" title="No image">
                                <FiImage />
                              </span>
                            )}
                          </td>
                          <td>
                            <Link href={`/dashboard/admin/edit-product/${p._id}`} className="product-name">
                              {p.name}
                            </Link>
                            <div className="product-meta">Min order {count(moq)}</div>
                          </td>
                          <td className="text-muted">{p.category?.name || "—"}</td>
                          <td className="text-end price-cell">
                            <span className="price-now">{inr(price)}</span>
                            {discounted && (
                              <span className="price-was">
                                {inr(mrp)} <span className="price-off">{off}% off</span>
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="pill pill-type">{String(p.productFor || "—").toUpperCase()}</span>
                          </td>
                          <td>
                            <span className={`pill ${p.status === "published" ? "pill-green" : "pill-slate"}`}>
                              {p.status === "published" ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td>
                            {/* Live count, so the badge and the real quantity never disagree */}
                            <span className={`pill ${out ? "pill-red" : belowMoq ? "pill-amber" : "pill-green"}`}>
                              {out ? "Out of stock" : `${count(units)} in stock`}
                            </span>
                            {belowMoq && (
                              <div className="stock-note">Below min order qty ({count(moq)})</div>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <select
                                className="form-select form-select-sm status-select"
                                value={p.status}
                                disabled={busyId === p._id}
                                onChange={(e) => toggleStatus(p._id, e.target.value)}
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                              </select>
                              <Link
                                href={`/dashboard/admin/edit-product/${p._id}`}
                                className="icon-btn"
                                title="Edit product"
                              >
                                <FiEdit2 />
                              </Link>
                              <button
                                type="button"
                                className="icon-btn icon-danger"
                                title="Delete product"
                                disabled={busyId === p._id}
                                onClick={() => deleteProduct(p._id, p.name)}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="empty">
                          <FiPackage className="empty-icon" />
                          <div className="empty-title">No products found</div>
                          <div className="empty-sub">
                            {hasFilters
                              ? "Nothing matches these filters yet."
                              : "Add your first product to see it here."}
                          </div>
                          {hasFilters ? (
                            <button className="btn btn-outline-secondary btn-sm mt-2" onClick={clearFilters}>
                              Clear filters
                            </button>
                          ) : (
                            <Link href="/dashboard/admin/add-product" className="btn btn-primary btn-sm mt-2">
                              Add Product
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ───────────────────────────────────────────── */}
            {!loading && products.length > 0 && (
              <div className="table-foot">
                <span className="foot-count">
                  Showing {count(first)}–{count(last)} of {count(pagination.total)}
                </span>
                {pagination.pages > 1 && (
                  <div className="pager">
                    <button
                      className="pager-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchProducts(pagination.page - 1)}
                      aria-label="Previous page"
                    >
                      <FiChevronLeft />
                    </button>
                    {pageWindow.map((n) => (
                      <button
                        key={n}
                        onClick={() => fetchProducts(n)}
                        className={`pager-btn ${pagination.page === n ? "is-current" : ""}`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      className="pager-btn"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => fetchProducts(pagination.page + 1)}
                      aria-label="Next page"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .products-page {
          --ink: #0f172a;
          --muted: #64748b;
          --line: #e7ebf0;
          --surface: #ffffff;
          --shell: #f7f8fa;
        }
        .page-sub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
        }

        /* Summary tiles */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-left: 3px solid var(--tone, #cbd5e1);
          border-radius: 12px;
          background: var(--surface);
          transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
        }
        .stat-card:not(.is-static):hover {
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.07);
          transform: translateY(-1px);
        }
        .stat-card.is-static {
          cursor: default;
        }
        .stat-card.is-active {
          border-color: var(--tone, #cbd5e1);
          box-shadow: 0 0 0 2px var(--tone-soft, #e2e8f0);
        }
        .stat-label {
          font-size: 12px;
          color: var(--muted);
          letter-spacing: 0.01em;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--tone-text, var(--ink));
          font-variant-numeric: tabular-nums;
        }
        .tone-slate { --tone: #94a3b8; --tone-soft: #e2e8f0; --tone-text: #0f172a; }
        .tone-blue  { --tone: #3b82f6; --tone-soft: #dbeafe; --tone-text: #1d4ed8; }
        .tone-green { --tone: #22c55e; --tone-soft: #dcfce7; --tone-text: #15803d; }
        .tone-red   { --tone: #ef4444; --tone-soft: #fee2e2; --tone-text: #b91c1c; }
        .tone-amber { --tone: #f59e0b; --tone-soft: #fef3c7; --tone-text: #b45309; }

        /* Panel + toolbar */
        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--line);
          background: var(--shell);
        }
        .search-wrap {
          position: relative;
          flex: 1 1 240px;
          min-width: 200px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }
        .search-input {
          padding-left: 36px;
          padding-right: 32px;
          height: 38px;
          border-radius: 9px;
        }
        .search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: none;
          color: var(--muted);
          line-height: 1;
          padding: 4px;
        }
        .tool-select {
          height: 38px;
          border-radius: 9px;
          flex: 0 1 165px;
          min-width: 140px;
          font-size: 14px;
        }
        .btn-clear {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          text-decoration: none;
          color: #b91c1c;
          padding: 4px 6px;
        }

        /* Table */
        .product-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .product-table :global(thead th) {
          background: var(--shell);
          border-bottom: 1px solid var(--line);
          border-top: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 11px 14px;
          white-space: nowrap;
        }
        .product-table :global(tbody td) {
          border-top: 0;
          border-bottom: 1px solid var(--line);
          padding: 12px 14px;
          vertical-align: middle;
        }
        .product-table :global(tbody tr:last-child td) {
          border-bottom: 0;
        }
        .product-table :global(tbody tr:hover td) {
          background: #fafbfc;
        }
        .product-table :global(tr.is-busy) {
          opacity: 0.55;
        }
        .thumb {
          width: 52px;
          height: 52px;
          object-fit: cover;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: #fff;
          display: block;
        }
        .thumb-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f4f6f9;
          color: #b6c0cd;
          font-size: 18px;
        }
        .product-name {
          color: var(--ink);
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
        }
        .product-name:hover {
          text-decoration: underline;
        }
        .product-meta {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }
        .price-cell {
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .price-now {
          display: block;
          font-weight: 600;
          color: var(--ink);
        }
        .price-was {
          display: block;
          font-size: 12px;
          color: var(--muted);
          text-decoration: line-through;
        }
        .price-off {
          color: #15803d;
          text-decoration: none;
          margin-left: 4px;
        }

        .pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          line-height: 1.5;
        }
        .pill-green { background: #dcfce7; color: #15803d; }
        .pill-red   { background: #fee2e2; color: #b91c1c; }
        .pill-amber { background: #fef3c7; color: #b45309; }
        .pill-slate { background: #eef2f7; color: #475569; }
        .pill-type  { background: #eef2ff; color: #4338ca; letter-spacing: 0.04em; }
        .stock-note {
          font-size: 11px;
          color: #b45309;
          margin-top: 4px;
        }

        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }
        .status-select {
          width: 118px;
          border-radius: 8px;
          font-size: 13px;
        }
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #fff;
          color: #475569;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .icon-btn:hover {
          background: #f1f5f9;
          color: var(--ink);
        }
        .icon-danger:hover {
          background: #fee2e2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        /* Loading + empty */
        .sk {
          display: inline-block;
          background: linear-gradient(90deg, #eef1f5 25%, #f7f9fb 37%, #eef1f5 63%);
          background-size: 400% 100%;
          animation: shimmer 1.3s ease infinite;
          border-radius: 6px;
        }
        .sk-thumb { width: 52px; height: 52px; border-radius: 9px; }
        .sk-line { height: 12px; width: 100%; }
        .sk-pill { height: 20px; width: 84px; border-radius: 999px; }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sk { animation: none; }
        }
        .empty {
          text-align: center;
          padding: 44px 16px;
          color: var(--muted);
        }
        .empty-icon {
          font-size: 30px;
          color: #cbd5e1;
          margin-bottom: 10px;
        }
        .empty-title {
          font-weight: 600;
          color: var(--ink);
          font-size: 15px;
        }
        .empty-sub {
          font-size: 13px;
          margin-top: 2px;
        }

        /* Footer */
        .table-foot {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 16px;
          border-top: 1px solid var(--line);
          background: var(--shell);
        }
        .foot-count {
          font-size: 13px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
        }
        .pager {
          display: flex;
          gap: 6px;
        }
        .pager-btn {
          min-width: 34px;
          height: 34px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #fff;
          color: #475569;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pager-btn:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .pager-btn:disabled {
          opacity: 0.45;
        }
        .pager-btn.is-current {
          background: #0d6efd;
          border-color: #0d6efd;
          color: #fff;
          font-weight: 600;
        }

        @media (max-width: 575.98px) {
          .tool-select { flex: 1 1 calc(50% - 5px); min-width: 0; }
          .status-select { width: 100px; }
        }
      `}</style>
    </div>
  );
}
