// pages/dashboard/admin/categories/index.js
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CategoriesAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // create form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    parent: "",
    imageFile: null,
  });
  const [editing, setEditing] = useState(null); // category id when editing

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/categories");
      setCategories(res.data || []);
    } catch (err) {
      console.error("fetch categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imageFile") {
      setForm((p) => ({ ...p, imageFile: files?.[0] || null }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const resetForm = () => setForm({ name: "", parent: "", imageFile: null });

  const handleCreateOrUpdate = async () => {
    if (!form.name?.trim()) return toast.error("Category name required");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("parent", form.parent || "");
      if (form.imageFile) fd.append("image", form.imageFile);

      if (editing) {
        // update
        const res = await axios.put(`/api/categories/${editing}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category updated");
      } else {
        // create
        const res = await axios.post("/api/categories", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category created");
      }
      resetForm();
      setShowForm(false);
      setEditing(null);
      fetchCategories();
    } catch (err) {
      console.error("create/update category:", err);
      toast.error(err.response?.data?.message || "Error saving category");
    }
  };

  const startEdit = (cat) => {
    setEditing(cat._id);
    setForm({ name: cat.name, parent: cat.parent || "", imageFile: null });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}" ? This is permanent.`)) return;
    try {
      await axios.delete(`/api/categories/${cat._id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (err) {
      console.error("delete category:", err);
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="flex-grow-1" style={{ marginLeft: sidebarOpen ? "220px" : 0, transition: "0.3s" }}>
        <div className="container-fluid p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1>Category Management</h1>
            <div>
              <button className="btn btn-outline-secondary me-2" onClick={() => { resetForm(); setEditing(null); setShowForm((s) => !s); }}>
                {showForm ? "Close" : "+ Add Category"}
              </button>
              <Link href="/dashboard/admin/products" className="btn btn-outline-primary">Back to Products</Link>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="card p-3 mb-4">
              <h5>{editing ? "Edit Category" : "Add Category"}</h5>
              <div className="row g-2 align-items-end">
                <div className="col-md-5">
                  <label className="form-label">Name</label>
                  <input name="name" className="form-control" value={form.name} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Parent (optional)</label>
                  <select name="parent" className="form-select" value={form.parent || ""} onChange={handleChange}>
                    <option value="">No Parent (Top Level)</option>
                    {categories
                      .filter(c => !c.parent) // only show top-level as possible parents for simplicity
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Image (optional)</label>
                  <input type="file" name="imageFile" className="form-control" accept="image/*" onChange={handleChange} />
                </div>

                <div className="col-12 mt-3">
                  <button className="btn btn-success me-2" onClick={handleCreateOrUpdate}>{editing ? "Save Changes" : "Create Category"}</button>
                  <button className="btn btn-outline-secondary" onClick={() => { resetForm(); setShowForm(false); setEditing(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card p-3">
            <h5>All Categories</h5>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Parent</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">No categories found</td>
                      </tr>
                    )}
                    {categories.map((c) => {
                      const parent = categories.find((x) => String(x._id) === String(c.parent));
                      return (
                        <tr key={c._id}>
                          <td style={{ width: 120 }}>
                            {c.image ? <img src={c.image} alt={c.name} style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6 }} /> : <div className="text-muted">—</div>}
                          </td>
                          <td>{c.name}</td>
                          <td>{c.slug}</td>
                          <td>{parent ? parent.name : "—"}</td>
                          <td>{new Date(c.createdAt).toLocaleString()}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(c)}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(c)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
