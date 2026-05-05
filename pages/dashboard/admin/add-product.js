// pages/admin/add-product.js
// CHANGES FROM ORIGINAL:
//   • Replaced flat <select> category dropdown with <CategorySelect> component
//   • Removed fetchCategories(), createCategory(), categories state, newCategory state
//     (CategorySelect handles its own data fetching)
//   • All other logic (B2B/B2C, attributes, pricing tiers, images) is 100% unchanged

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaBell } from "react-icons/fa";
import Sidebar from "@/components/admin-panel/Sidebar";
import CategorySelect from "@/components/admin-panel/CategorySelect"; // ← NEW

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function AddProduct() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [form, setForm] = useState({
    name: "",
    price: "",
    shortDescription: "",
    description: "",
    ourSpecialization: "",
    importantNotes: "",
    categoryId: "",
    basePrice: "",
    salePrice: "",
    sku: "",
    stock: 0,
    stockStatus: "in_stock",
    minOrderQty: 1,
    isFeatured: false,
    gstPercent: 0,
    hsnCode: "",      // NEW: HSN/SAC code for invoicing
    productFor: "b2b",
    attributes: [],
    pricingTiers: [],
    pricingTiersCSV: "",
    b2b_enabled: true,
    b2b_allowFileUpload: true,
    b2b_quantityOptionsCSV: "",
    b2c_enabled: false,
    b2c_designUpload: false,
    b2c_whatsapp: false,
    b2c_quantityOptionsCSV: "",
  });

  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [previewMain, setPreviewMain] = useState(null);
  const [previewGallery, setPreviewGallery] = useState([]);

  const submittingRef = useRef(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMainImage = (e) => {
    const f = e.target.files[0];
    setMainImageFile(f);
    setPreviewMain(f ? URL.createObjectURL(f) : null);
  };

  const handleGallery = (e) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(files);
    setPreviewGallery(files.map((f) => URL.createObjectURL(f)));
  };

  const parseTiersCSV = (csv) =>
    !csv ? [] : csv.split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
      const [minQtyRaw, priceRaw] = pair.split(":");
      return {
        minQty: parseInt((minQtyRaw || "1").trim(), 10) || 1,
        pricePerUnit: parseFloat((priceRaw || "0").trim()) || 0,
      };
    }).sort((a, b) => a.minQty - b.minQty);

  const parseQtyOptionsCSV = (csv) =>
    !csv ? [] : csv.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!form.name || !form.categoryId || form.basePrice === "" || form.basePrice === null) {
      return toast.error("Please enter name, category and base price.");
    }

    try {
      submittingRef.current = true;

      const transformedAttributes = form.attributes.map((attr) => {
        const rawOptions = Array.isArray(attr.options) ? attr.options : [];
        const values = rawOptions
          .filter((o) => o && (o.label || o.label === ""))
          .map((o) => ({
            label: String(o.label || "").trim(),
            priceModifier: Number(o.priceModifier || 0),
            pricingTiers: (o.pricingTiers || [])
              .filter(t => t.minQty !== "" && t.priceModifier !== "")
              .map(t => ({ minQty: Number(t.minQty), priceModifier: Number(t.priceModifier) })),
          }));

        return {
          name: String(attr.name || "").trim(),
          type: attr.type || "select",
          values,
          required: !!attr.required,
          uploadRules:
            attr.type === "upload"
              ? {
                  required: !!attr.uploadRules?.required,
                  acceptTypes: attr.uploadRules?.acceptTypes || [],
                  maxSizeMB: attr.uploadRules?.maxSizeMB || 5,
                  uploadFor: attr.uploadRules?.uploadFor || "all",
                  imageDimensions:
                    attr.uploadRules?.imageDimensions
                      ? typeof attr.uploadRules.imageDimensions === "string"
                        ? { unit: "px", values: attr.uploadRules.imageDimensions }
                        : attr.uploadRules.imageDimensions
                      : null,
                }
              : undefined,
        };
      });

      const tiersCSV = (form.pricingTiers || []).map((t) => `${t.minQty}:${t.pricePerUnit}`).join(",");
      form.pricingTiersCSV = tiersCSV;
      const transformedTiers = parseTiersCSV(form.pricingTiersCSV || "");
      const b2bQtyOptions = parseQtyOptionsCSV(form.b2b_quantityOptionsCSV || "");
      const b2cQtyOptions = parseQtyOptionsCSV(form.b2c_quantityOptionsCSV || "");

      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("shortDescription", form.shortDescription || "");
      fd.append("description", form.description || "");
      fd.append("ourSpecialization", form.ourSpecialization || "");
      fd.append("importantNotes", form.importantNotes || "");
      fd.append("categoryId", form.categoryId);
      fd.append("basePrice", String(form.basePrice));
      fd.append("salePrice", form.salePrice || "");
      fd.append("sku", form.sku || "");
      fd.append("stock", String(form.stock || 0));
      fd.append("stockStatus", form.stockStatus || "in_stock");
      fd.append("minOrderQty", String(form.minOrderQty || 1));
      fd.append("isFeatured", String(form.isFeatured));
      fd.append("gstPercent", String(form.gstPercent || 0));
      fd.append("hsnCode", form.hsnCode || "");  // NEW
      fd.append("productFor", form.productFor || "both");
      fd.append("attributes", JSON.stringify(transformedAttributes));
      fd.append("pricingTiers", JSON.stringify(transformedTiers));

      fd.append("b2bOptions", JSON.stringify({
        enabled: !!form.b2b_enabled,
        allowFileUpload: !!form.b2b_allowFileUpload,
        quantityOptions: b2bQtyOptions,
      }));
      fd.append("b2cOptions", JSON.stringify({
        enabled: !!form.b2c_enabled,
        designUpload: !!form.b2c_designUpload,
        whatsappSupport: !!form.b2c_whatsapp,
        quantityOptions: b2cQtyOptions,
      }));

      if (mainImageFile) fd.append("mainImage", mainImageFile);
      galleryFiles.forEach((f) => fd.append("gallery", f));

      await axios.post("/api/products", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Product created");
      setForm({
        name: "", shortDescription: "", description: "", ourSpecialization: "",
        importantNotes: "", categoryId: "", basePrice: "", salePrice: "", sku: "",
        stock: 0, stockStatus: "in_stock", minOrderQty: 1, isFeatured: false,
        gstPercent: 0, hsnCode: "", productFor: "b2b", attributes: [], pricingTiersCSV: "", pricingTiers: [],
        b2b_enabled: false, b2b_allowFileUpload: true, b2b_quantityOptionsCSV: "",
        b2c_enabled: true, b2c_designUpload: true, b2c_whatsapp: true, b2c_quantityOptionsCSV: "",
      });
      setMainImageFile(null);
      setGalleryFiles([]);
      setPreviewMain(null);
      setPreviewGallery([]);
    } catch (err) {
      console.error("Add product submit:", err);
      toast.error(err.response?.data?.message || "Error creating product");
    } finally {
      submittingRef.current = false;
    }
  };

  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { name: "", type: "select", required: false, options: [], uploadRules: { imageDimensions: { unit: "px", values: "" } } },
      ],
    }));
  };

  const removeAttribute = (index) => {
    setForm((prev) => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));
  };

  const updateAttribute = (index, updatedData) => {
    setForm((prev) => {
      const newAttrs = [...prev.attributes];
      newAttrs[index] = { ...newAttrs[index], ...updatedData };
      return { ...prev, attributes: newAttrs };
    });
  };

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        {/* Top navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
          <button className="btn btn-outline-primary me-3" onClick={toggleSidebar}>☰</button>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3" size={20} />
            <div className="dropdown">
              <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                Admin
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><Link className="dropdown-item" href="#">Profile</Link></li>
                <li><Link className="dropdown-item" href="#">Logout</Link></li>
              </ul>
            </div>
          </div>
        </nav>

        <div className="container-fluid p-4">
          <h1 className="dashboard-main-h">Add Products</h1>

          <div className="add-product-page">

            {/* ── Category Section — now uses CategorySelect ── */}
            <section className="category-section mb-4">
              <h5 className="mb-2">Select Category</h5>
              {/* CategorySelect shows parent categories as group headers (not selectable)
                  and subcategories as selectable options.
                  If a parent has no children, it is itself selectable. */}
              <CategorySelect
                value={form.categoryId}
                onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
              />
              <small className="text-muted">
                Select a subcategory. Parent categories are shown as group headers.
              </small>
            </section>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* ── Left Column ── */}
                <div className="form-left">
                  <select name="productFor" value={form.productFor} onChange={handleChange} className="select-primary">
                    <option value="b2b">B2B only</option>
                    <option value="b2c">B2C only</option>
                  </select>

                  <input name="name" placeholder="Product Name" value={form.name} onChange={handleChange} className="input-primary" required />

                  {/* Attributes Section — unchanged */}
                  <div className="attributes-section">
                    <h4>Custom Attributes</h4>
                    {form.attributes.map((attr, i) => (
                      <div key={i} className="attribute-card mb-3 p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <input type="text" className="form-control" placeholder="Attribute Name (e.g. Side)" value={attr.name}
                            onChange={(e) => updateAttribute(i, { name: e.target.value })} />
                          <select className="form-select" value={attr.type} onChange={(e) => updateAttribute(i, { type: e.target.value })}>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="upload">Upload File</option>
                          </select>
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" checked={!!attr.required}
                              onChange={(e) => updateAttribute(i, { required: e.target.checked })} />
                            <label className="form-check-label">Required</label>
                          </div>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeAttribute(i)}>Delete</button>
                        </div>

                        <div className="options-section ms-3">
                          <label className="fw-bold">Options:</label>
                          {attr.options?.map((opt, j) => (
                            <div key={j} className="mb-3 p-2 border rounded" style={{ background: "#f9f9f9" }}>
                              {/* ── Option label + default price ── */}
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <input type="text" className="form-control" placeholder="Option Label (e.g. Single Side)" value={opt.label}
                                  onChange={(e) => { const o = [...attr.options]; o[j] = { ...o[j], label: e.target.value }; updateAttribute(i, { options: o }); }} />
                                <input type="number" className="form-control" placeholder="Default Price (₹)" value={opt.priceModifier}
                                  style={{ maxWidth: 160 }}
                                  onChange={(e) => { const o = [...attr.options]; o[j] = { ...o[j], priceModifier: e.target.value }; updateAttribute(i, { options: o }); }} />
                                <button type="button" className="btn btn-sm btn-outline-danger"
                                  onClick={() => { updateAttribute(i, { options: attr.options.filter((_, idx) => idx !== j) }); }}>❌</button>
                              </div>

                              {/* ── Qty-based pricing tiers for this option ── */}
                              <div className="ms-2 mt-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <small className="text-muted fw-semibold">Qty Pricing Tiers (optional):</small>
                                  <button type="button" className="btn btn-xs btn-outline-secondary"
                                    style={{ fontSize: 11, padding: "1px 8px" }}
                                    onClick={() => {
                                      const o = [...attr.options];
                                      o[j] = { ...o[j], pricingTiers: [...(o[j].pricingTiers || []), { minQty: "", priceModifier: "" }] };
                                      updateAttribute(i, { options: o });
                                    }}>+ Add Tier</button>
                                </div>
                                {(opt.pricingTiers || []).map((tier, ti) => (
                                  <div key={ti} className="d-flex align-items-center gap-2 mb-1">
                                    <span style={{ fontSize: 12, color: "#6b7280", minWidth: 28 }}>≥</span>
                                    <input type="number" className="form-control form-control-sm" placeholder="Min Qty" value={tier.minQty}
                                      style={{ maxWidth: 100 }}
                                      onChange={(e) => {
                                        const o = [...attr.options];
                                        const tiers = [...(o[j].pricingTiers || [])];
                                        tiers[ti] = { ...tiers[ti], minQty: e.target.value };
                                        o[j] = { ...o[j], pricingTiers: tiers };
                                        updateAttribute(i, { options: o });
                                      }} />
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>→ ₹</span>
                                    <input type="number" className="form-control form-control-sm" placeholder="Price" value={tier.priceModifier}
                                      style={{ maxWidth: 100 }}
                                      onChange={(e) => {
                                        const o = [...attr.options];
                                        const tiers = [...(o[j].pricingTiers || [])];
                                        tiers[ti] = { ...tiers[ti], priceModifier: e.target.value };
                                        o[j] = { ...o[j], pricingTiers: tiers };
                                        updateAttribute(i, { options: o });
                                      }} />
                                    <button type="button" className="btn btn-xs btn-outline-danger"
                                      style={{ fontSize: 11, padding: "1px 6px" }}
                                      onClick={() => {
                                        const o = [...attr.options];
                                        o[j] = { ...o[j], pricingTiers: (o[j].pricingTiers || []).filter((_, ti2) => ti2 !== ti) };
                                        updateAttribute(i, { options: o });
                                      }}>✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {attr.type === "upload" && (
                            <div className="upload-rules-section mt-3 p-3 border rounded bg-light">
                              <h6 className="fw-bold mb-2">Upload Rules</h6>
                              <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" checked={attr.uploadRules?.required || false}
                                  onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, required: e.target.checked } })} />
                                <label className="form-check-label">Mandatory File Upload</label>
                              </div>
                              <label className="fw-bold">Accepted File Types</label>
                              <input type="text" className="form-control mb-2" placeholder="e.g. png,jpg,pdf,cdr"
                                value={(attr.uploadRules?.acceptTypes || []).join(",")}
                                onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, acceptTypes: e.target.value.split(",").map((s) => s.trim()) } })} />
                              <label className="fw-bold">Max File Size (MB)</label>
                              <input type="number" className="form-control mb-2" value={attr.uploadRules?.maxSizeMB || 5}
                                onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, maxSizeMB: Number(e.target.value) } })} />
                              <label className="fw-bold mt-2">Dimension Unit</label>
                              <select className="form-select mb-2" value={attr.uploadRules?.imageDimensions?.unit || "px"}
                                onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, imageDimensions: { unit: e.target.value, values: attr.uploadRules?.imageDimensions?.values || "" } } })}>
                                <option value="px">Pixels (px)</option>
                                <option value="mm">Millimeter (mm)</option>
                                <option value="inch">Inch (in)</option>
                              </select>
                              <label className="fw-bold">Allowed Dimensions</label>
                              <input type="text" className="form-control mb-2" placeholder="e.g. 1280x760 or 210x297"
                                value={attr.uploadRules?.imageDimensions?.values || ""}
                                onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, imageDimensions: { unit: attr.uploadRules?.imageDimensions?.unit || "px", values: e.target.value } } })} />
                              <small className="text-muted">Enter width x height. Unit depends on selection above.</small>
                              <label className="fw-bold mt-2">Upload For</label>
                              <select className="form-select" value={attr.uploadRules?.uploadFor || "all"}
                                onChange={(e) => updateAttribute(i, { uploadRules: { ...attr.uploadRules, uploadFor: e.target.value } })}>
                                <option value="front">Front</option>
                                <option value="back">Back</option>
                                <option value="all">All</option>
                              </select>
                            </div>
                          )}

                          <button type="button" className="btn btn-sm btn-outline-primary mt-2"
                            onClick={() => updateAttribute(i, { options: [...(attr.options || []), { label: "", priceModifier: 0, pricingTiers: [] }] })}>
                            + Add Option
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-primary mt-3" onClick={addAttribute}>+ Add Attribute</button>
                  </div>

                  {/* Description Editors — unchanged */}
                  <label>Description</label>
                  <ReactQuill value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} theme="snow" />
                  <label className="mt-3">Our Specialization</label>
                  <ReactQuill value={form.ourSpecialization} onChange={(v) => setForm((p) => ({ ...p, ourSpecialization: v }))} theme="snow" />
                  <label className="mt-3">Important Notes</label>
                  <ReactQuill value={form.importantNotes} onChange={(v) => setForm((p) => ({ ...p, importantNotes: v }))} theme="snow" />

                  {/* Pricing — unchanged */}
                  <div className="pricing-row mt-3">
                    <div>
                      <label>GST %</label>
                      <select name="gstPercent" value={form.gstPercent} onChange={handleChange} className="select-primary">
                        <option value={0}>0% (None)</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                    {/* NEW: HSN/SAC Code */}
                    <div>
                      <label>HSN / SAC Code</label>
                      <input name="hsnCode" value={form.hsnCode} onChange={handleChange} className="input-primary" placeholder="e.g. 4911, 4901" />
                    </div>
                  </div>

                  <div className="pricing-row mt-3">
                    <div>
                      <label>Base Price</label>
                      <input name="basePrice" value={form.basePrice} onChange={handleChange} type="number" className="input-primary" required />
                    </div>
                    <div>
                      <label>Sale Price</label>
                      <input name="salePrice" value={form.salePrice} onChange={handleChange} type="number" className="input-primary" />
                    </div>
                  </div>

                  <div className="sku-stock-row">
                    <div>
                      <label>SKU</label>
                      <input name="sku" value={form.sku} onChange={handleChange} className="input-primary" />
                    </div>
                    <div>
                      <label>Stock</label>
                      <input name="stock" value={form.stock} onChange={handleChange} type="number" className="input-primary" />
                    </div>
                    <div>
                      <label>Status</label>
                      <select name="stockStatus" value={form.stockStatus} onChange={handleChange} className="select-primary">
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="preorder">Preorder</option>
                      </select>
                    </div>
                  </div>

                  <div className="min-order-row">
                    <label>Min Order Qty</label>
                    <input name="minOrderQty" value={form.minOrderQty} onChange={handleChange} type="number" className="input-primary" />
                  </div>

                  {/* Pricing Tiers — unchanged */}
                  <label className="mb-2">Quantity Pricing Tiers</label>
                  {form.pricingTiers?.map((tier, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input type="number" placeholder="Min Qty" className="input-primary w-1/2" value={tier.minQty}
                        onChange={(e) => { const u = [...form.pricingTiers]; u[index].minQty = e.target.value; setForm((f) => ({ ...f, pricingTiers: u })); }} />
                      <input type="number" placeholder="Price" className="input-primary w-1/2" value={tier.pricePerUnit}
                        onChange={(e) => { const u = [...form.pricingTiers]; u[index].pricePerUnit = e.target.value; setForm((f) => ({ ...f, pricingTiers: u })); }} />
                      <button type="button" className="bg-red-500 px-2 rounded"
                        onClick={() => { const u = [...form.pricingTiers]; u.splice(index, 1); setForm((f) => ({ ...f, pricingTiers: u })); }}>X</button>
                    </div>
                  ))}
                  <button type="button" className="bg-green-500 px-4 py-1 rounded"
                    onClick={() => setForm((f) => ({ ...f, pricingTiers: [...(f.pricingTiers || []), { minQty: "", pricePerUnit: "" }] }))}>
                    + Add Tier
                  </button>

                  {/* B2B / B2C — unchanged */}
                  <div className="d-flex gap-5 bg-light px-3 mt-4">
                    <div className="b2b-section mt-3">
                      <h5 className="mb-3">B2B Options</h5>
                      <label><input type="checkbox" name="b2b_enabled" checked={form.b2b_enabled} onChange={handleChange} /> Enable B2B</label>
                      <label><input type="checkbox" name="b2b_allowFileUpload" checked={form.b2b_allowFileUpload} onChange={handleChange} /> Allow file upload</label>
                    </div>
                    <div className="b2c-section mt-3">
                      <h5 className="mb-3">B2C Options</h5>
                      <label><input type="checkbox" name="b2c_enabled" checked={form.b2c_enabled} onChange={handleChange} /> Enable B2C</label>
                      <label><input type="checkbox" name="b2c_designUpload" checked={form.b2c_designUpload} onChange={handleChange} /> Allow design upload</label>
                      <label><input type="checkbox" name="b2c_whatsapp" checked={form.b2c_whatsapp} onChange={handleChange} /> WhatsApp support</label>
                    </div>
                  </div>
                </div>

                {/* ── Right Column — unchanged ── */}
                <div className="form-right">
                  <div className="image-upload-section">
                    <label>Main Image</label>
                    <input type="file" accept="image/*" onChange={handleMainImage} className="file-input" />
                    {previewMain && <img src={previewMain} alt="preview" className="image-preview" />}
                    <label>Gallery Images</label>
                    <input type="file" accept="image/*" multiple onChange={handleGallery} className="file-input" />
                    <div className="gallery-preview">
                      {previewGallery.map((p, i) => <img key={i} src={p} alt="gallery" />)}
                    </div>
                  </div>
                  <button type="submit" className="btn save-btn">Save Product</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}





// // pages/admin/add-product.js
// import { useEffect, useState, useRef } from "react";
// import axios from "axios";
// import dynamic from "next/dynamic";
// import toast from "react-hot-toast";
// import Link from "next/link";
// import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import CategorySelect from "@/components/admin-panel/CategorySelect";

// const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// export default function AddProduct() {
//   const [showCategoryForm, setShowCategoryForm] = useState(false);
//   const [newCategoryName, setNewCategoryName] = useState("");
//   const [parentCategoryId, setParentCategoryId] = useState("");

//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const [categories, setCategories] = useState([]);
//   const [newCategory, setNewCategory] = useState("");

//   const [form, setForm] = useState({
//     name: "",
//     price: "",
//     shortDescription: "",
//     description: "",
//     ourSpecialization: "",
//     importantNotes: "",
//     categoryId: "",
//     basePrice: "", // required
//     salePrice: "",
//     sku: "",
//     stock: 0,
//     stockStatus: "in_stock",
//     minOrderQty: 1,
//     isFeatured: false,
//     productFor: "b2b",

//     // attributes & pricing tiers (CSV inputs)
//     attributes: [],
//     pricingTiers: [],
//     pricingTiersCSV: "",

//     // B2B
//     b2b_enabled: true,
//     b2b_allowFileUpload: true,
//     b2b_quantityOptionsCSV: "", // e.g. "50,100,200"

//     // B2C
//     b2c_enabled: false,
//     b2c_designUpload: false,
//     b2c_whatsapp: false,
//     b2c_quantityOptionsCSV: "", // optional, if you want fixed options for B2C
//   });

//   const [mainImageFile, setMainImageFile] = useState(null);
//   const [galleryFiles, setGalleryFiles] = useState([]);
//   const [previewMain, setPreviewMain] = useState(null);
//   const [previewGallery, setPreviewGallery] = useState([]);

//   // simple ref to prevent duplicate submissions
//   const submittingRef = useRef(false);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       const res = await axios.get("/api/categories");
//       setCategories(res.data || []);
//     } catch (err) {
//       console.error("fetchCategories:", err);
//     }
//   };

//   const createCategory = async () => {
//     if (!newCategory.trim()) return toast.error("Enter category name");
//     try {
//       const res = await axios.post("/api/categories", {
//         name: newCategory.trim(),
//       });
//       toast.success("Category added");
//       setCategories((c) => [...c, res.data]);
//       setNewCategory("");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error creating category");
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm((prev) => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const handleMainImage = (e) => {
//     const f = e.target.files[0];
//     setMainImageFile(f);
//     setPreviewMain(f ? URL.createObjectURL(f) : null);
//   };

//   const handleGallery = (e) => {
//     const files = Array.from(e.target.files || []);
//     setGalleryFiles(files);
//     setPreviewGallery(files.map((f) => URL.createObjectURL(f)));
//   };

//   // parse attribute values CSV "Label:modifier,Label2:modifier"
//   const parseValuesCSV = (csv) =>
//     !csv
//       ? []
//       : csv
//           .split(",")
//           .map((s) => s.trim())
//           .filter(Boolean)
//           .map((pair) => {
//             const [labelRaw, modRaw] = pair.split(":");
//             return {
//               label: (labelRaw || "").trim(),
//               priceModifier: parseFloat((modRaw || "0").trim()) || 0,
//             };
//           });

//   // parse pricing tiers CSV "1:10,50:8,100:6"
//   const parseTiersCSV = (csv) =>
//     !csv
//       ? []
//       : csv
//           .split(",")
//           .map((s) => s.trim())
//           .filter(Boolean)
//           .map((pair) => {
//             const [minQtyRaw, priceRaw] = pair.split(":");
//             return {
//               minQty: parseInt((minQtyRaw || "1").trim(), 10) || 1,
//               pricePerUnit: parseFloat((priceRaw || "0").trim()) || 0,
//             };
//           })
//           .sort((a, b) => a.minQty - b.minQty);

//   // parse quantity options CSV -> array of numbers
//   const parseQtyOptionsCSV = (csv) =>
//     !csv
//       ? []
//       : csv
//           .split(",")
//           .map((s) => Number(s.trim()))
//           .filter((n) => !isNaN(n) && n > 0)
//           .sort((a, b) => a - b);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (submittingRef.current) return;
//     if (
//       !form.name ||
//       !form.categoryId ||
//       form.basePrice === "" ||
//       form.basePrice === null
//     ) {
//       return toast.error("Please enter name, category and base price.");
//     }

//     try {
//       submittingRef.current = true;

//       // prepare attributes: ensure we map front-end attr.options -> values (numbers)
//       const transformedAttributes = form.attributes.map((attr) => {
//         const rawOptions = Array.isArray(attr.options) ? attr.options : [];

//         const values = rawOptions
//           .filter((o) => o && (o.label || o.label === ""))
//           .map((o) => ({
//             label: String(o.label || "").trim(),
//             priceModifier: Number(o.priceModifier || 0),
//           }));

//         return {
//           name: String(attr.name || "").trim(),
//           type: attr.type || "select",
//           values,
//           required: !!attr.required,

//           // ⭐ NEW upload rules — safe optional
//           uploadRules:
//             attr.type === "upload"
//               ? {
//                   required: !!attr.uploadRules?.required,
//                   acceptTypes: attr.uploadRules?.acceptTypes || [],
//                   maxSizeMB: attr.uploadRules?.maxSizeMB || 5,
//                   uploadFor: attr.uploadRules?.uploadFor || "all",
//                   // imageDimensions: attr.uploadRules?.imageDimensions || "",
//                   imageDimensions:
//                     attr.uploadRules?.imageDimensions
//                       ? typeof attr.uploadRules.imageDimensions === "string"
//                         ? { unit: "px", values: attr.uploadRules.imageDimensions }
//                         : attr.uploadRules.imageDimensions
//                       : null

//                 }
//               : undefined,
//         };
//       });

//       // convert dynamic tiers → CSV string
//       const tiersCSV = (form.pricingTiers || [])
//         .map((t) => `${t.minQty}:${t.pricePerUnit}`)
//         .join(",");

//       form.pricingTiersCSV = tiersCSV;

//       // pricing tiers
//       const transformedTiers = parseTiersCSV(form.pricingTiersCSV || "");

//       // quantity options
//       const b2bQtyOptions = parseQtyOptionsCSV(
//         form.b2b_quantityOptionsCSV || ""
//       );
//       const b2cQtyOptions = parseQtyOptionsCSV(
//         form.b2c_quantityOptionsCSV || ""
//       );

//       const fd = new FormData();
//       fd.append("name", form.name);
//       fd.append("shortDescription", form.shortDescription || "");
//       fd.append("description", form.description || "");
//       fd.append("ourSpecialization", form.ourSpecialization || "");
//       fd.append("importantNotes", form.importantNotes || "");
//       fd.append("categoryId", form.categoryId);
//       fd.append("basePrice", String(form.basePrice));
//       fd.append("salePrice", form.salePrice || "");
//       fd.append("sku", form.sku || "");
//       fd.append("stock", String(form.stock || 0));
//       fd.append("stockStatus", form.stockStatus || "in_stock");
//       fd.append("minOrderQty", String(form.minOrderQty || 1));
//       fd.append("isFeatured", String(form.isFeatured));
//       fd.append("productFor", form.productFor || "both");

//       fd.append("attributes", JSON.stringify(transformedAttributes));
//       fd.append("pricingTiers", JSON.stringify(transformedTiers));

//       // Build B2B and B2C option objects
//       const b2bOptions = {
//         enabled: !!form.b2b_enabled,
//         allowFileUpload: !!form.b2b_allowFileUpload,
//         quantityOptions: b2bQtyOptions, // array of numbers
//       };
//       fd.append("b2bOptions", JSON.stringify(b2bOptions));

//       const b2cOptions = {
//         enabled: !!form.b2c_enabled,
//         designUpload: !!form.b2c_designUpload,
//         whatsappSupport: !!form.b2c_whatsapp,
//         quantityOptions: b2cQtyOptions, // optional array of numbers
//       };
//       fd.append("b2cOptions", JSON.stringify(b2cOptions));

//       // files
//       if (mainImageFile) fd.append("mainImage", mainImageFile);
//       galleryFiles.forEach((f) => fd.append("gallery", f));

//       const res = await axios.post("/api/products", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       toast.success("Product created");
//       // reset
//       setForm({
//         name: "",
//         shortDescription: "",
//         description: "",
//         ourSpecialization: "",
//         importantNotes: "",
//         categoryId: "",
//         basePrice: "",
//         salePrice: "",
//         sku: "",
//         stock: 0,
//         stockStatus: "in_stock",
//         minOrderQty: 1,
//         isFeatured: false,
//         productFor: "b2b",

//         attributes: [],
//         pricingTiersCSV: "",
//         pricingTiers: [], // ← ADD THIS ✔
//         b2b_enabled: false,
//         b2b_allowFileUpload: true,
//         b2b_quantityOptionsCSV: "",
//         b2c_enabled: true,
//         b2c_designUpload: true,
//         b2c_whatsapp: true,
//         b2c_quantityOptionsCSV: "",
//       });
//       setMainImageFile(null);
//       setGalleryFiles([]);
//       setPreviewMain(null);
//       setPreviewGallery([]);
//     } catch (err) {
//       console.error("Add product submit:", err);
//       toast.error(err.response?.data?.message || "Error creating product");
//     } finally {
//       submittingRef.current = false;
//     }
//   };

//   // Add new attribute
//   const addAttribute = () => {
//     setForm((prev) => ({
//       ...prev,
//       attributes: [
//         ...prev.attributes,
//         // { name: "", type: "select", required: false, options: [] },

//         {
//   name: "",
//   type: "select",
//   required: false,
//   options: [],
//   uploadRules: {
//     imageDimensions: { unit: "px", values: "" }
//   }
// }

//       ],
//     }));
//   };

//   // Remove attribute
//   const removeAttribute = (index) => {
//     setForm((prev) => ({
//       ...prev,
//       attributes: prev.attributes.filter((_, i) => i !== index),
//     }));
//   };

//   // Update attribute
//   const updateAttribute = (index, updatedData) => {
//     setForm((prev) => {
//       const newAttrs = [...prev.attributes];
//       newAttrs[index] = { ...newAttrs[index], ...updatedData };
//       return { ...prev, attributes: newAttrs };
//     });
//   };

//   const handleAddCategory = async () => {
//     if (!newCategoryName.trim()) return toast.error("Category name required");

//     try {
//       const res = await axios.post("/api/categories", {
//         name: newCategoryName.trim(),
//         parent: parentCategoryId || null,
//       });

//       toast.success("Category added");

//       setCategories((prev) => [...prev, res.data]);

//       // reset form
//       setNewCategoryName("");
//       setParentCategoryId("");
//       setShowCategoryForm(false);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Error adding category");
//     }
//   };

//   return (
//     <div className="d-flex">
//       {/* Sidebar */}

//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="main-area"
       
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3" size={20} />
//             <div className="dropdown">
//               <button
//                 className="btn btn-secondary dropdown-toggle"
//                 type="button"
//                 id="profileDropdown"
//                 data-bs-toggle="dropdown"
//                 aria-expanded="false"
//               >
//                 Admin
//               </button>
//               <ul
//                 className="dropdown-menu dropdown-menu-end"
//                 aria-labelledby="profileDropdown"
//               >
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Profile
//                   </Link>
//                 </li>
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Logout
//                   </Link>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </nav>

//         {/* Dashboard content */}
//         <div className="container-fluid p-4">
//           <h1 className="dashboard-main-h" >Add Products</h1>

//           <div className="add-product-page">
//             {/* Categories */}

//             <section className="category-section mb-4">
//               <h5 className="mb-3">Select Category</h5>

//               {/* Main Category Selector */}
//               {/* <select
//                 name="categoryId"
//                 value={form.categoryId}
//                 onChange={handleChange}
//                 className="form-select mb-2"
//               >
//                 <option value="">Select Category</option>
//                 {categories.map((c) => (
//                   <option key={c._id} value={c._id}>
//                     {c.name}
//                   </option>
//                 ))}
//               </select> */}


//               <CategorySelect
//   value={form.categoryId}
//   onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
// />

              
//             </section>

           

//             <form onSubmit={handleSubmit}>
//               <div className="form-grid">
//                 {/* Left Column */}
//                 <div className="form-left">
//                   <select
//                     name="productFor"
//                     value={form.productFor}
//                     onChange={handleChange}
//                     className="select-primary"
//                   >
//                     {/* <option value="both">Both (B2B & B2C)</option> */}
//                     <option value="b2b">B2B only</option>
//                     <option value="b2c">B2C only</option>
//                   </select>
//                   <input
//                     name="name"
//                     placeholder="Product Name"
//                     value={form.name}
//                     onChange={handleChange}
//                     className="input-primary"
//                     required
//                   />
                  

//                   {/* Attributes Section */}
//                   <div className="attributes-section">
//                     <h4>Custom Attributes</h4>

//                     {form.attributes.map((attr, i) => (
//                       <div
//                         key={i}
//                         className="attribute-card mb-3 p-3 border rounded"
//                       >
//                         {/* Attribute Name + Type + Required */}
//                         <div className="d-flex align-items-center gap-2 mb-2">
//                           <input
//                             type="text"
//                             className="form-control"
//                             placeholder="Attribute Name (e.g. Side)"
//                             value={attr.name}
//                             onChange={(e) =>
//                               updateAttribute(i, { name: e.target.value })
//                             }
//                           />
//                           <select
//                             className="form-select"
//                             value={attr.type}
//                             onChange={(e) =>
//                               updateAttribute(i, { type: e.target.value })
//                             }
//                           >
//                             <option value="select">Select</option>
//                             <option value="checkbox">Checkbox</option>
//                             <option value="text">Text</option>
//                             <option value="number">Number</option>
//                             <option value="upload">Upload File</option>{" "}
//                             {/* ⭐ NEW */}
//                           </select>

//                           <div className="form-check">
//                             <input
//                               className="form-check-input"
//                               type="checkbox"
//                               checked={!!attr.required}
//                               onChange={(e) =>
//                                 updateAttribute(i, {
//                                   required: e.target.checked,
//                                 })
//                               }
//                             />
//                             <label className="form-check-label">Required</label>
//                           </div>
//                           <button
//                             type="button"
//                             className="btn btn-sm btn-danger"
//                             onClick={() => removeAttribute(i)}
//                           >
//                             Delete
//                           </button>
//                         </div>

//                         {/* Attribute Options */}
//                         <div className="options-section ms-3">
//                           <label className="fw-bold">Options:</label>
//                           {attr.options?.map((opt, j) => (
//                             <div
//                               key={j}
//                               className="d-flex align-items-center gap-2 mb-2"
//                             >
//                               <input
//                                 type="text"
//                                 className="form-control"
//                                 placeholder="Option Label (e.g. Single Side)"
//                                 value={opt.label}
//                                 onChange={(e) => {
//                                   const newOptions = [...attr.options];
//                                   newOptions[j].label = e.target.value;
//                                   updateAttribute(i, { options: newOptions });
//                                 }}
//                               />
//                               <input
//                                 type="number"
//                                 className="form-control"
//                                 placeholder="Price Modifier (₹)"
//                                 value={opt.priceModifier}
//                                 onChange={(e) => {
//                                   const newOptions = [...attr.options];
//                                   newOptions[j].priceModifier = e.target.value;
//                                   updateAttribute(i, { options: newOptions });
//                                 }}
//                               />
//                               <button
//                                 type="button"
//                                 className="btn btn-sm btn-outline-danger"
//                                 onClick={() => {
//                                   const newOptions = attr.options.filter(
//                                     (_, idx) => idx !== j
//                                   );
//                                   updateAttribute(i, { options: newOptions });
//                                 }}
//                               >
//                                 ❌
//                               </button>
//                             </div>
//                           ))}

//                           {attr.type === "upload" && (
//                             <div className="upload-rules-section mt-3 p-3 border rounded bg-light">
//                               <h6 className="fw-bold mb-2">Upload Rules</h6>

//                               {/* Required Upload */}
//                               <div className="form-check mb-2">
//                                 <input
//                                   className="form-check-input"
//                                   type="checkbox"
//                                   checked={attr.uploadRules?.required || false}
//                                   onChange={(e) =>
//                                     updateAttribute(i, {
//                                       uploadRules: {
//                                         ...attr.uploadRules,
//                                         required: e.target.checked,
//                                       },
//                                     })
//                                   }
//                                 />
//                                 <label className="form-check-label">
//                                   Mandatory File Upload
//                                 </label>
//                               </div>

//                               {/* Acceptable File Types */}
//                               <label className="fw-bold">
//                                 Accepted File Types
//                               </label>
//                               <input
//                                 type="text"
//                                 className="form-control mb-2"
//                                 placeholder="e.g. png,jpg,pdf"
//                                 value={(
//                                   attr.uploadRules?.acceptTypes || []
//                                 ).join(",")}
//                                 onChange={(e) =>
//                                   updateAttribute(i, {
//                                     uploadRules: {
//                                       ...attr.uploadRules,
//                                       acceptTypes: e.target.value
//                                         .split(",")
//                                         .map((s) => s.trim()),
//                                     },
//                                   })
//                                 }
//                               />

//                               {/* Max Size */}
//                               <label className="fw-bold">
//                                 Max File Size (MB)
//                               </label>
//                               <input
//                                 type="number"
//                                 className="form-control mb-2"
//                                 placeholder="Max Size"
//                                 value={attr.uploadRules?.maxSizeMB || 5}
//                                 onChange={(e) =>
//                                   updateAttribute(i, {
//                                     uploadRules: {
//                                       ...attr.uploadRules,
//                                       maxSizeMB: Number(e.target.value),
//                                     },
//                                   })
//                                 }
//                               />

//                               {/* Image Dimensions (optional) */}
//                               <label className="fw-bold mt-2">
//                                 Allowed Image Dimensions (comma separated)
//                               </label>
                            



//                               {/* Dimension Unit */}
//                                 <label className="fw-bold mt-2">Dimension Unit</label>
//                                 <select
//                                   className="form-select mb-2"
//                                   value={attr.uploadRules?.imageDimensions?.unit || "px"}
//                                   onChange={(e) =>
//                                     updateAttribute(i, {
//                                       uploadRules: {
//                                         ...attr.uploadRules,
//                                         imageDimensions: {
//                                           unit: e.target.value,
//                                           values: attr.uploadRules?.imageDimensions?.values || "",
//                                         },
//                                       },
//                                     })
//                                   }
//                                 >
//                                   <option value="px">Pixels (px)</option>
//                                   <option value="mm">Millimeter (mm)</option>
//                                   <option value="inch">Inch (in)</option>
//                                 </select>

//                                 {/* Dimension Values */}
//                                 <label className="fw-bold">Allowed Dimensions</label>
//                                 <input
//                                   type="text"
//                                   className="form-control mb-2"
//                                   placeholder="e.g. 1280x760 or 210x297"
//                                   value={attr.uploadRules?.imageDimensions?.values || ""}
//                                   onChange={(e) =>
//                                     updateAttribute(i, {
//                                       uploadRules: {
//                                         ...attr.uploadRules,
//                                         imageDimensions: {
//                                           unit: attr.uploadRules?.imageDimensions?.unit || "px",
//                                           values: e.target.value,
//                                         },
//                                       },
//                                     })
//                                   }
//                                 />

//                                 <small className="text-muted">
//                                   Enter width x height. Unit depends on selection above.
//                                 </small>

//                               <small className="text-muted">
//                                 Enter widthxheight values separated by commas.
//                                 Users must upload an image matching one of these
//                                 exactly.
//                               </small>

//                               {/* Upload Side */}
//                               <label className="fw-bold">Upload For</label>
//                               <select
//                                 className="form-select"
//                                 value={attr.uploadRules?.uploadFor || "all"}
//                                 onChange={(e) =>
//                                   updateAttribute(i, {
//                                     uploadRules: {
//                                       ...attr.uploadRules,
//                                       uploadFor: e.target.value,
//                                     },
//                                   })
//                                 }
//                               >
//                                 <option value="front">Front</option>
//                                 <option value="back">Back</option>
//                                 <option value="all">All</option>
//                               </select>
//                             </div>
//                           )}

//                           <button
//                             type="button"
//                             className="btn btn-sm btn-outline-primary"
//                             onClick={() => {
//                               const newOptions = attr.options
//                                 ? [
//                                     ...attr.options,
//                                     { label: "", priceModifier: 0 },
//                                   ]
//                                 : [{ label: "", priceModifier: 0 }];
//                               updateAttribute(i, { options: newOptions });
//                             }}
//                           >
//                             + Add Option
//                           </button>
//                         </div>
//                       </div>
//                     ))}

//                     <button
//                       type="button"
//                       className="btn btn-primary mt-3"
//                       onClick={addAttribute}
//                     >
//                       + Add Attribute
//                     </button>
//                   </div>

//                   {/* Description Editors */}
//                   <label>Description</label>
//                   <ReactQuill
//                     value={form.description}
//                     onChange={(v) => setForm((p) => ({ ...p, description: v }))}
//                     theme="snow"
//                   />

//                   <label className="mt-3">Our Specialization</label>
//                   <ReactQuill
//                     value={form.ourSpecialization}
//                     onChange={(v) =>
//                       setForm((p) => ({ ...p, ourSpecialization: v }))
//                     }
//                     theme="snow"
//                   />

//                   <label className="mt-3">Important Notes</label>
//                   <ReactQuill
//                     value={form.importantNotes}
//                     onChange={(v) =>
//                       setForm((p) => ({ ...p, importantNotes: v }))
//                     }
//                     theme="snow"
//                   />

//                   {/* Pricing */}
//                   <div className="pricing-row mt-3">
//                     <div>
//                       <label>Base Price</label>
//                       <input
//                         name="basePrice"
//                         value={form.basePrice}
//                         onChange={handleChange}
//                         type="number"
//                         className="input-primary"
//                         required
//                       />
//                     </div>
//                     <div>
//                       <label>Sale Price</label>
//                       <input
//                         name="salePrice"
//                         value={form.salePrice}
//                         onChange={handleChange}
//                         type="number"
//                         className="input-primary"
//                       />
//                     </div>
//                   </div>

//                   <div className="sku-stock-row">
//                     <div>
//                       <label>SKU</label>
//                       <input
//                         name="sku"
//                         value={form.sku}
//                         onChange={handleChange}
//                         className="input-primary"
//                       />
//                     </div>
//                     <div>
//                       <label>Stock</label>
//                       <input
//                         name="stock"
//                         value={form.stock}
//                         onChange={handleChange}
//                         type="number"
//                         className="input-primary"
//                       />
//                     </div>
//                     <div>
//                       <label>Status</label>
//                       <select
//                         name="stockStatus"
//                         value={form.stockStatus}
//                         onChange={handleChange}
//                         className="select-primary"
//                       >
//                         <option value="in_stock">In Stock</option>
//                         <option value="out_of_stock">Out of Stock</option>
//                         <option value="preorder">Preorder</option>
//                       </select>
//                     </div>
//                   </div>

//                   <div className="min-order-row">
//                     <label>Min Order Qty</label>
//                     <input
//                       name="minOrderQty"
//                       value={form.minOrderQty}
//                       onChange={handleChange}
//                       type="number"
//                       className="input-primary"
//                     />
                  
//                   </div>
                 

//                   <label className="mb-2">Quantity Pricing Tiers</label>

//                   {form.pricingTiers?.map((tier, index) => (
//                     <div key={index} className="flex gap-2 mb-2">
//                       <input
//                         type="number"
//                         placeholder="Min Qty"
//                         className="input-primary w-1/2"
//                         value={tier.minQty}
//                         onChange={(e) => {
//                           const updated = [...form.pricingTiers];
//                           updated[index].minQty = e.target.value;
//                           setForm((f) => ({ ...f, pricingTiers: updated }));
//                         }}
//                       />

//                       <input
//                         type="number"
//                         placeholder="Price"
//                         className="input-primary w-1/2"
//                         value={tier.pricePerUnit}
//                         onChange={(e) => {
//                           const updated = [...form.pricingTiers];
//                           updated[index].pricePerUnit = e.target.value;
//                           setForm((f) => ({ ...f, pricingTiers: updated }));
//                         }}
//                       />

//                       <button
//                         type="button"
//                         onClick={() => {
//                           const updated = [...form.pricingTiers];
//                           updated.splice(index, 1);
//                           setForm((f) => ({ ...f, pricingTiers: updated }));
//                         }}
//                         className="bg-red-500 px-2 rounded"
//                       >
//                         X
//                       </button>
//                     </div>
//                   ))}

//                   <button
//                     type="button"
//                     className="bg-green-500  px-4 py-1 rounded"
//                     onClick={() =>
//                       setForm((f) => ({
//                         ...f,
//                         pricingTiers: [
//                           ...(f.pricingTiers || []),
//                           { minQty: "", pricePerUnit: "" },
//                         ],
//                       }))
//                     }
//                   >
//                     + Add Tier
//                   </button>

//                  <div className="d-flex gap-5 bg-light px-3 mt-4">
//                    {/* B2B / B2C Options */}
//                   <div className="b2b-section mt-3">
//                     <h5 className="mb-3">B2B Options</h5>
//                     <label>
//                       <input
//                         type="checkbox"
//                         name="b2b_enabled"
//                         checked={form.b2b_enabled}
//                         onChange={handleChange}
//                       />{" "}
//                       Enable B2B
//                     </label>
//                     <label>
//                       <input
//                         type="checkbox"
//                         name="b2b_allowFileUpload"
//                         checked={form.b2b_allowFileUpload}
//                         onChange={handleChange}
//                       />{" "}
//                       Allow file upload
//                     </label>
//                     {/* <input
//                       placeholder="Quantity options (comma separated)"
//                       value={form.b2b_quantityOptionsCSV}
//                       onChange={(e) =>
//                         setForm((f) => ({
//                           ...f,
//                           b2b_quantityOptionsCSV: e.target.value,
//                         }))
//                       }
//                       className="input-primary"
//                     /> */}
//                   </div>

//                   <div className="b2c-section mt-3">
//                     <h5 className="mb-3">B2C Options</h5>
//                     <label>
//                       <input
//                         type="checkbox"
//                         name="b2c_enabled"
//                         checked={form.b2c_enabled}
//                         onChange={handleChange}
//                       />{" "}
//                       Enable B2C
//                     </label>
//                     <label>
//                       <input
//                         type="checkbox"
//                         name="b2c_designUpload"
//                         checked={form.b2c_designUpload}
//                         onChange={handleChange}
//                       />{" "}
//                       Allow design upload
//                     </label>
//                     <label>
//                       <input
//                         type="checkbox"
//                         name="b2c_whatsapp"
//                         checked={form.b2c_whatsapp}
//                         onChange={handleChange}
//                       />{" "}
//                       WhatsApp support
//                     </label>
//                     {/* <input
//                       placeholder="Fixed quantity options (comma separated)"
//                       value={form.b2c_quantityOptionsCSV}
//                       onChange={(e) =>
//                         setForm((f) => ({
//                           ...f,
//                           b2c_quantityOptionsCSV: e.target.value,
//                         }))
//                       }
//                       className="input-primary"
//                     /> */}
//                   </div>
//                  </div>
//                 </div>

//                 {/* Right Column */}
//                 <div className="form-right">
//                   <div className="image-upload-section">
//                     <label>Main Image</label>
//                     <input
//                       type="file"
//                       accept="image/*"
//                       onChange={handleMainImage}
//                       className="file-input"
//                     />
//                     {previewMain && (
//                       <img
//                         src={previewMain}
//                         alt="preview"
//                         className="image-preview"
//                       />
//                     )}

//                     <label>Gallery Images</label>
//                     <input
//                       type="file"
//                       accept="image/*"
//                       multiple
//                       onChange={handleGallery}
//                       className="file-input"
//                     />
//                     <div className="gallery-preview">
//                       {previewGallery.map((p, i) => (
//                         <img key={i} src={p} alt="gallery" />
//                       ))}
//                     </div>
//                   </div>

//                   <button type="submit" className="btn save-btn">
//                     Save Product
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
