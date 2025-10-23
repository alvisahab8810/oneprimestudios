"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";

export default function AdminProductList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    productFor: "",
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  // Fetch products
  const fetchProducts = async (page = 1) => {
    try {
      const { data } = await axios.get("/api/products/admin/list", {
        params: { ...filters, page },
      });
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get("/api/categories/list");
      setCategories(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts(1); // reset to page 1 when filters change
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Toggle publish/draft status
  const toggleStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/products/status/${id}`, { status: newStatus });
      fetchProducts(pagination.page); // refresh table
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    if (!confirm("Are you sure to delete this product?")) return;
    try {
      await axios.delete(`/api/products/admin/delete/${id}`);
      fetchProducts(pagination.page);
    } catch (err) {
      console.error("Failed to delete product", err);
    }
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}

      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main content */}
      <div
        className="flex-grow-1"
        style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
      >
        {/* Top navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3" size={20} />
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="profileDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Admin
              </button>
              <ul
                className="dropdown-menu dropdown-menu-end"
                aria-labelledby="profileDropdown"
              >
                <li>
                  <Link className="dropdown-item" href="#">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="#">
                    Logout
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Dashboard content */}
        <div className="container-fluid p-4">

            <div className="d-flex justify-content-between align-items-center ">
              <h1 className="mb-4">Products</h1>
              <Link
                href="/dashboard/admin/add-product"
                className="btn btn-primary"
              >
                + Add Product
              </Link>
            </div>
          

          <div className="products-list-area ">
          

            {/* Filters */}
            <div className="row mb-3">
              <div className="col-md-3 mb-2">
                <input
                  type="text"
                  name="search"
                  className="form-control"
                  placeholder="Search by name"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="col-md-2 mb-2">
                <select
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="col-md-3 mb-2">
                <select
                  name="category"
                  className="form-select"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2 mb-2">
                <select
                  name="productFor"
                  className="form-select"
                  value={filters.productFor}
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  <option value="b2b">B2B</option>
                  <option value="b2c">B2C</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length > 0 ? (
                    products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <img
                            src={p.mainImage || "/no-image.png"}
                            width="50"
                            height="50"
                            className="rounded"
                            alt={p.name}
                          />
                        </td>
                        <td>{p.name}</td>
                        <td>{p.category?.name || "-"}</td>
                        <td>
                          ₹{p.salePrice || p.basePrice}{" "}
                          {p.salePrice && (
                            <small className="text-muted text-decoration-line-through">
                              ₹{p.basePrice}
                            </small>
                          )}
                        </td>
                        <td>{p.productFor.toUpperCase()}</td>
                        <td>
                          <span
                            className={`badge ${
                              p.status === "published"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.stockStatus === "in_stock"
                                ? "bg-success"
                                : "bg-danger"
                            }`}
                          >
                            {p.stockStatus}
                          </span>
                        </td>
                        <td className="d-flex">
                          <select
                            className="form-select form-select-sm select-status"
                            value={p.status}
                            onChange={(e) =>
                              toggleStatus(p._id, e.target.value)
                            }
                          >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                          </select>
                          <Link
                            //   href={`/dashboard/products/edit/${p._id}`}
                            href={`#`}
                            className="btn btn-sm btn-outline-secondary me-1"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteProduct(p._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="d-flex justify-content-center mt-3">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => fetchProducts(i + 1)}
                  className={`btn btn-sm mx-1 ${
                    pagination.page === i + 1
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
