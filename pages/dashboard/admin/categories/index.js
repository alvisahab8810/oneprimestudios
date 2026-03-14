// pages/dashboard/admin/categories/index.js
// CHANGES:
//   • Table now shows hierarchy: parent rows with indented child rows underneath
//   • Parent dropdown in form only shows top-level categories (correct, unchanged)
//   • categoryFor field added to form (b2b / b2c / both)
//   • Visual badge shows parent vs subcategory
//   • All existing create/edit/delete logic fully preserved

"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CategoriesAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categories, setCategories] = useState([]); // flat list from API
  const [loading, setLoading] = useState(false);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    parent: "",
    categoryFor: "both",
    imageFile: null,
  });
  const [editing, setEditing] = useState(null); // category _id when editing

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // withChildren=true → API returns parent categories each with a `children` array
      const res = await axios.get("/api/categories?withChildren=true");
      // The API returns top-level cats with children attached.
      // We also need all flat for the parent dropdown → store both.
      // Build a flat list for the dropdown and a nested list for the table.
      const topLevel = res.data || [];
      // flatten for dropdown
      const flat = [];
      topLevel.forEach((cat) => {
        flat.push(cat);
        (cat.children || []).forEach((ch) => flat.push(ch));
      });
      setCategories(flat);
      setNestedCategories(topLevel);
    } catch (err) {
      console.error("fetch categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  // nested list used for table rendering
  const [nestedCategories, setNestedCategories] = useState([]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imageFile") {
      setForm((p) => ({ ...p, imageFile: files?.[0] || null }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const resetForm = () =>
    setForm({ name: "", parent: "", categoryFor: "both", imageFile: null });

  const handleCreateOrUpdate = async () => {
    if (!form.name?.trim()) return toast.error("Category name required");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("parent", form.parent || "");
      fd.append("categoryFor", form.categoryFor || "both");
      if (form.imageFile) fd.append("image", form.imageFile);

      if (editing) {
        await axios.put(`/api/categories/${editing}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category updated");
      } else {
        await axios.post("/api/categories", fd, {
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
    setForm({
      name: cat.name,
      parent: cat.parent || "",
      categoryFor: cat.categoryFor || "both",
      imageFile: null,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? This is permanent.`)) return;

    // Check before deleting: warn user if this parent has children
    const hasChildren = nestedCategories.some(
      (p) => String(p._id) === String(cat._id) && (p.children || []).length > 0
    );
    if (hasChildren) {
      toast.error(
        `Cannot delete "${cat.name}" — it has subcategories. Delete the subcategories first.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      await axios.delete(`/api/categories/${cat._id}`);
      toast.success(`"${cat.name}" deleted successfully`);
      fetchCategories();
    } catch (err) {
      // Pull the exact reason from the API (400 = has children or has products)
      const reason = err.response?.data?.message || "Delete failed";
      toast.error(reason, { duration: 5000 });
      // Do NOT re-throw — prevents Next.js dev overlay from catching it
    }
  };

  // only top-level categories as possible parents (no nesting more than 2 levels)
  const topLevelCategories = categories.filter((c) => !c.parent);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="dashboard-main-h">Category Management</h1>
            <div>
              <button
                className="btn btn-outline-secondary me-2"
                onClick={() => {
                  resetForm();
                  setEditing(null);
                  setShowForm((s) => !s);
                }}
              >
                {showForm ? "Close" : "+ Add Category"}
              </button>
              <Link
                href="/dashboard/admin/products"
                className="btn btn-outline-primary"
              >
                Back to Products
              </Link>
            </div>
          </div>

          {/* ── Form ────────────────────────────────────────────────────── */}
          {showForm && (
            <div className="card p-3 mb-4">
              <h5>{editing ? "Edit Category" : "Add Category"}</h5>
              <div className="row g-2 align-items-end">

                {/* Name */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">Name <span className="text-danger">*</span></label>
                  <input
                    name="name"
                    className="form-control"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Business Cards"
                  />
                </div>

                {/* Parent */}
                <div className="col-md-3">
                  <label className="form-label fw-bold">
                    Parent Category
                    <span className="text-muted fw-normal ms-1">(optional)</span>
                  </label>
                  <select
                    name="parent"
                    className="form-select"
                    value={form.parent || ""}
                    onChange={handleChange}
                  >
                    <option value="">— No Parent (Top Level) —</option>
                    {topLevelCategories
                      // when editing, exclude itself from parent options
                      .filter((c) => c._id !== editing)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <small className="text-muted">
                    Leave empty to create a top-level category
                  </small>
                </div>

                {/* Category For (B2B/B2C) */}
                <div className="col-md-2">
                  <label className="form-label fw-bold">Visible For</label>
                  <select
                    name="categoryFor"
                    className="form-select"
                    value={form.categoryFor}
                    onChange={handleChange}
                  >
                    <option value="both">Both (B2B & B2C)</option>
                    <option value="b2b">B2B only</option>
                    <option value="b2c">B2C only</option>
                  </select>
                </div>

                {/* Image */}
                <div className="col-md-3">
                  <label className="form-label fw-bold">Image (optional)</label>
                  <input
                    type="file"
                    name="imageFile"
                    className="form-control"
                    accept="image/*"
                    onChange={handleChange}
                  />
                </div>

                {/* Buttons */}
                <div className="col-12 mt-3">
                  <button
                    className="btn btn-success me-2"
                    onClick={handleCreateOrUpdate}
                  >
                    {editing ? "Save Changes" : "Create Category"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                      setEditing(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Table ───────────────────────────────────────────────────── */}
          <div className="card p-3">
            <h5 className="mb-3">
              All Categories
              <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: 12 }}>
                {categories.length} total
              </span>
            </h5>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 90 }}>Image</th>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Type</th>
                      <th>Visible For</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nestedCategories.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          No categories found. Click "+ Add Category" to create one.
                        </td>
                      </tr>
                    )}

                    {nestedCategories.map((parent) => (
                      <React.Fragment key={parent._id}>

                        {/* ── Parent category row ── */}
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <td>
                            {parent.image ? (
                              <img
                                src={parent.image}
                                alt={parent.name}
                                style={{
                                  width: 70,
                                  height: 45,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                }}
                              />
                            ) : (
                              <div className="text-muted">—</div>
                            )}
                          </td>
                          <td>
                            <span className="fw-bold">{parent.name}</span>
                            {(parent.children || []).length > 0 && (
                              <span className="badge bg-primary ms-2" style={{ fontSize: 11 }}>
                                {parent.children.length} sub
                              </span>
                            )}
                          </td>
                          <td>
                            <code style={{ fontSize: 12 }}>{parent.slug}</code>
                          </td>
                          <td>
                            <span className="badge bg-dark">Parent</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              parent.categoryFor === "b2b"
                                ? "bg-warning text-dark"
                                : parent.categoryFor === "b2c"
                                ? "bg-info text-dark"
                                : "bg-success"
                            }`}>
                              {parent.categoryFor || "both"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {new Date(parent.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => startEdit(parent)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => confirmDelete(parent)}
                              disabled={(parent.children || []).length > 0}
                              title={
                                (parent.children || []).length > 0
                                  ? "Delete subcategories first before deleting this parent"
                                  : "Delete this category"
                              }
                            >
                              Delete
                            </button>
                            {(parent.children || []).length > 0 && (
                              <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                                Remove subs first
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* ── Child category rows ── */}
                        {(parent.children || []).map((child) => (
                          <tr key={child._id}>
                            <td>
                              {child.image ? (
                                <img
                                  src={child.image}
                                  alt={child.name}
                                  style={{
                                    width: 70,
                                    height: 45,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                  }}
                                />
                              ) : (
                                <div className="text-muted">—</div>
                              )}
                            </td>
                            <td>
                              {/* Indented to show hierarchy */}
                              <span style={{ paddingLeft: 24, color: "#555" }}>
                                ↳ {child.name}
                              </span>
                            </td>
                            <td>
                              <code style={{ fontSize: 12 }}>{child.slug}</code>
                            </td>
                            <td>
                              <span className="badge bg-secondary">Sub</span>
                            </td>
                            <td>
                              <span className={`badge ${
                                child.categoryFor === "b2b"
                                  ? "bg-warning text-dark"
                                  : child.categoryFor === "b2c"
                                  ? "bg-info text-dark"
                                  : "bg-success"
                              }`}>
                                {child.categoryFor || "both"}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {new Date(child.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => startEdit(child)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => confirmDelete(child)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Legend ──────────────────────────────────────────────────── */}
          <div className="mt-3 d-flex gap-3 align-items-center text-muted" style={{ fontSize: 12 }}>
            <span>
              <span className="badge bg-dark me-1">Parent</span> Top-level category
            </span>
            <span>
              <span className="badge bg-secondary me-1">Sub</span> Subcategory (shown under parent)
            </span>
            <span>
              <span className="badge bg-success me-1">both</span>
              <span className="badge bg-warning text-dark me-1">b2b</span>
              <span className="badge bg-info text-dark me-1">b2c</span> Visibility
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}










// // pages/dashboard/admin/categories/index.js
// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import Link from "next/link";
// import toast from "react-hot-toast";

// export default function CategoriesAdmin() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // create form state
//   const [showForm, setShowForm] = useState(false);
//   const [form, setForm] = useState({
//     name: "",
//     parent: "",
//     imageFile: null,
//   });
//   const [editing, setEditing] = useState(null); // category id when editing

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get("/api/categories");
//       setCategories(res.data || []);
//     } catch (err) {
//       console.error("fetch categories:", err);
//       toast.error("Failed to load categories");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, files } = e.target;
//     if (name === "imageFile") {
//       setForm((p) => ({ ...p, imageFile: files?.[0] || null }));
//     } else {
//       setForm((p) => ({ ...p, [name]: value }));
//     }
//   };

//   const resetForm = () => setForm({ name: "", parent: "", imageFile: null });

//   const handleCreateOrUpdate = async () => {
//     if (!form.name?.trim()) return toast.error("Category name required");
//     try {
//       const fd = new FormData();
//       fd.append("name", form.name.trim());
//       fd.append("parent", form.parent || "");
//       if (form.imageFile) fd.append("image", form.imageFile);

//       if (editing) {
//         // update
//         const res = await axios.put(`/api/categories/${editing}`, fd, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//         toast.success("Category updated");
//       } else {
//         // create
//         const res = await axios.post("/api/categories", fd, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//         toast.success("Category created");
//       }
//       resetForm();
//       setShowForm(false);
//       setEditing(null);
//       fetchCategories();
//     } catch (err) {
//       console.error("create/update category:", err);
//       toast.error(err.response?.data?.message || "Error saving category");
//     }
//   };

//   const startEdit = (cat) => {
//     setEditing(cat._id);
//     setForm({ name: cat.name, parent: cat.parent || "", imageFile: null });
//     setShowForm(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const confirmDelete = async (cat) => {
//     if (!confirm(`Delete category "${cat.name}" ? This is permanent.`)) return;
//     try {
//       await axios.delete(`/api/categories/${cat._id}`);
//       toast.success("Category deleted");
//       fetchCategories();
//     } catch (err) {
//       console.error("delete category:", err);
//       toast.error(err.response?.data?.message || "Delete failed");
//     }
//   };

//   return (
//     <div className="d-flex">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       <div className="main-area">
//         <div className="container-fluid p-4">
//           <div className="d-flex justify-content-between align-items-center mb-3">
//             <h1 className="dashboard-main-h">Category Management</h1>
//             <div>
//               <button className="btn btn-outline-secondary me-2" onClick={() => { resetForm(); setEditing(null); setShowForm((s) => !s); }}>
//                 {showForm ? "Close" : "+ Add Category"}
//               </button>
//               <Link href="/dashboard/admin/products" className="btn btn-outline-primary">Back to Products</Link>
//             </div>
//           </div>

//           {/* Form */}
//           {showForm && (
//             <div className="card p-3 mb-4">
//               <h5>{editing ? "Edit Category" : "Add Category"}</h5>
//               <div className="row g-2 align-items-end">
//                 <div className="col-md-5">
//                   <label className="form-label">Name</label>
//                   <input name="name" className="form-control" value={form.name} onChange={handleChange} />
//                 </div>
//                 <div className="col-md-4">
//                   <label className="form-label">Parent (optional)</label>
//                   <select name="parent" className="form-select" value={form.parent || ""} onChange={handleChange}>
//                     <option value="">No Parent (Top Level)</option>
//                     {categories
//                       .filter(c => !c.parent) // only show top-level as possible parents for simplicity
//                       .map((c) => (
//                         <option key={c._id} value={c._id}>
//                           {c.name}
//                         </option>
//                       ))}
//                   </select>
//                 </div>
//                 <div className="col-md-3">
//                   <label className="form-label">Image (optional)</label>
//                   <input type="file" name="imageFile" className="form-control" accept="image/*" onChange={handleChange} />
//                 </div>

//                 <div className="col-12 mt-3">
//                   <button className="btn btn-success me-2" onClick={handleCreateOrUpdate}>{editing ? "Save Changes" : "Create Category"}</button>
//                   <button className="btn btn-outline-secondary" onClick={() => { resetForm(); setShowForm(false); setEditing(null); }}>Cancel</button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Table */}
//           <div className="card p-3">
//             <h5>All Categories</h5>
//             {loading ? (
//               <div>Loading...</div>
//             ) : (
//               <div className="table-responsive">
//                 <table className="table table-bordered">
//                   <thead>
//                     <tr>
//                       <th>Image</th>
//                       <th>Name</th>
//                       <th>Slug</th>
//                       <th>Parent</th>
//                       <th>Created</th>
//                       <th>Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {categories.length === 0 && (
//                       <tr>
//                         <td colSpan="6" className="text-center text-muted">No categories found</td>
//                       </tr>
//                     )}
//                     {categories.map((c) => {
//                       const parent = categories.find((x) => String(x._id) === String(c.parent));
//                       return (
//                         <tr key={c._id}>
//                           <td style={{ width: 120 }}>
//                             {c.image ? <img src={c.image} alt={c.name} style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6 }} /> : <div className="text-muted">—</div>}
//                           </td>
//                           <td>{c.name}</td>
//                           <td>{c.slug}</td>
//                           <td>{parent ? parent.name : "—"}</td>
//                           <td>{new Date(c.createdAt).toLocaleString()}</td>
//                           <td>
//                             <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(c)}>Edit</button>
//                             <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(c)}>Delete</button>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
