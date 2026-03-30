"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";

const LIMIT = 10;

export default function PopularProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productForFilter, setProductForFilter] = useState("");
  const [popularFilter, setPopularFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Categories list
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios
      .get("/api/categories/list", { withCredentials: true })
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search.trim()) params.append("search", search.trim());
      if (categoryFilter) params.append("category", categoryFilter);
      if (productForFilter) params.append("productFor", productForFilter);
      if (popularFilter) params.append("isPopular", popularFilter);

      const res = await axios.get(`/api/admin/popular-products?${params}`, {
        withCredentials: true,
      });
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.pages || 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, productForFilter, popularFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, productForFilter, popularFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const togglePopular = async (productId, currentValue) => {
    setSaving((prev) => ({ ...prev, [productId]: true }));
    try {
      await axios.patch(
        "/api/admin/popular-products",
        { productId, isPopular: !currentValue },
        { withCredentials: true }
      );
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId ? { ...p, isPopular: !currentValue } : p
        )
      );
      toast.success(!currentValue ? "Marked as Popular" : "Removed from Popular");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setProductForFilter("");
    setPopularFilter("");
    setPage(1);
  };

  const hasFilters = search || categoryFilter || productForFilter || popularFilter;

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad">
          {/* TOP BAR */}
          <nav className="navbar navbar-light bg-light admin-topbar">
            <button
              className="btn btn-outline-primary me-3"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <img src="/assets/images/admin/indent-decrease.svg" />
            </button>
            <div className="ms-auto d-flex align-items-center">
              <div className="user-flow-icon">
                <img src="/assets/images/admin/profile.svg" />
              </div>
            </div>
          </nav>

          <div className="content-dashbord mt-2">
            {/* HEADER */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="dashboard-main-h mb-0">Popular Products</h2>
                <small className="text-muted">
                  Toggle which products appear in the &quot;Popular Products&quot; section on the homepage
                </small>
              </div>
              <span className="badge bg-primary fs-6 px-3 py-2">
                {total} product{total !== 1 ? "s" : ""} found
              </span>
            </div>

            {/* FILTERS ROW */}
            <div className="card shadow-sm mb-3">
              <div className="card-body py-3">
                <div className="row g-2 align-items-end">
                  {/* Search */}
                  <div className="col-md-3">
                    <label className="form-label mb-1 small fw-semibold">Search</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Product name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="col-md-3">
                    <label className="form-label mb-1 small fw-semibold">Category</label>
                    <select
                      className="form-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product For (B2B / B2C) */}
                  <div className="col-md-2">
                    <label className="form-label mb-1 small fw-semibold">Type</label>
                    <select
                      className="form-select"
                      value={productForFilter}
                      onChange={(e) => setProductForFilter(e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="b2b">B2B</option>
                      <option value="b2c">B2C</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  {/* Popular Status */}
                  <div className="col-md-2">
                    <label className="form-label mb-1 small fw-semibold">Popular Status</label>
                    <select
                      className="form-select"
                      value={popularFilter}
                      onChange={(e) => setPopularFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="true">Popular Only</option>
                      <option value="false">Not Popular</option>
                    </select>
                  </div>

                  {/* Reset */}
                  <div className="col-md-2">
                    <label className="form-label mb-1 small fw-semibold d-block">&nbsp;</label>
                    <button
                      className="btn btn-outline-secondary w-100"
                      onClick={resetFilters}
                      disabled={!hasFilters}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="card shadow-sm">
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                  </div>
                ) : (
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 60 }}>Image</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th className="text-center">Show as Popular</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">
                            No products found
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product._id}>
                            <td>
                              <img
                                src={
                                  product.mainImage ||
                                  "/assets/images/products/placeholder.png"
                                }
                                alt={product.name}
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                  border: "1px solid #eee",
                                }}
                              />
                            </td>
                            <td className="align-middle fw-medium">{product.name}</td>
                            <td className="align-middle text-muted">
                              {product.category?.name || "—"}
                            </td>
                            <td className="align-middle">
                              <span
                                className={`badge ${
                                  product.productFor === "b2b"
                                    ? "bg-warning text-dark"
                                    : product.productFor === "b2c"
                                    ? "bg-info text-dark"
                                    : "bg-secondary"
                                }`}
                              >
                                {product.productFor?.toUpperCase() || "BOTH"}
                              </span>
                            </td>
                            <td className="align-middle">
                              {product.salePrice ? (
                                <>
                                  <span className="text-danger fw-semibold">
                                    ₹{product.salePrice}
                                  </span>
                                  <span
                                    className="text-muted text-decoration-line-through ms-1"
                                    style={{ fontSize: 12 }}
                                  >
                                    ₹{product.basePrice}
                                  </span>
                                </>
                              ) : (
                                <span>₹{product.basePrice}</span>
                              )}
                            </td>
                            <td className="text-center align-middle">
                              {saving[product._id] ? (
                                <div
                                  className="spinner-border spinner-border-sm text-primary"
                                  role="status"
                                />
                              ) : (
                                <div className="form-check form-switch d-inline-block m-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    style={{ cursor: "pointer", width: 40, height: 22 }}
                                    checked={!!product.isPopular}
                                    onChange={() =>
                                      togglePopular(product._id, product.isPopular)
                                    }
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* PAGINATION */}
              {!loading && totalPages > 1 && (
                <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between py-2">
                  <small className="text-muted">
                    Page {page} of {totalPages} &nbsp;&bull;&nbsp; {total} total
                  </small>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                    >
                      «
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const pg = start + i;
                      return (
                        <button
                          key={pg}
                          className={`btn btn-sm ${pg === page ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setPage(pg)}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
