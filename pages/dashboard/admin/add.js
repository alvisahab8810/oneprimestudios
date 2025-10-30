// pages/admin/add-product.js
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
import Sidebar from "@/components/admin-panel/Sidebar";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function AddProduct() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");

  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    description: "",
    ourSpecialization: "",
    importantNotes: "",
    categoryId: "",
    basePrice: "", // required
    salePrice: "",
    sku: "",
    stock: 0,
    stockStatus: "in_stock",
    minOrderQty: 1,
    isFeatured: false,
    productFor: "both", // 'b2b' | 'b2c' | 'both'

    // attributes & pricing tiers (CSV inputs)
    attributes: [],
     sizeOptions: [], // e.g. [{ label: 'A4', price: 100 }, { label: 'A3', price: 150 }]

    pricingTiersCSV: "",

    // B2B
    b2b_enabled: false,
    b2b_allowFileUpload: true,
    b2b_quantityOptionsCSV: "", // e.g. "50,100,200"

    // B2C
    b2c_enabled: true,
    b2c_designUpload: true,
    b2c_whatsapp: true,
    b2c_quantityOptionsCSV: "", // optional, if you want fixed options for B2C
  });

  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [previewMain, setPreviewMain] = useState(null);
  const [previewGallery, setPreviewGallery] = useState([]);

  // simple ref to prevent duplicate submissions
  const submittingRef = useRef(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/categories");
      setCategories(res.data || []);
    } catch (err) {
      console.error("fetchCategories:", err);
    }
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return toast.error("Enter category name");
    try {
      const res = await axios.post("/api/categories", {
        name: newCategory.trim(),
      });
      toast.success("Category added");
      setCategories((c) => [...c, res.data]);
      setNewCategory("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating category");
    }
  };

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

  // parse attribute values CSV "Label:modifier,Label2:modifier"
  const parseValuesCSV = (csv) =>
    !csv
      ? []
      : csv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((pair) => {
            const [labelRaw, modRaw] = pair.split(":");
            return {
              label: (labelRaw || "").trim(),
              priceModifier: parseFloat((modRaw || "0").trim()) || 0,
            };
          });

  // parse pricing tiers CSV "1:10,50:8,100:6"
  const parseTiersCSV = (csv) =>
    !csv
      ? []
      : csv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((pair) => {
            const [minQtyRaw, priceRaw] = pair.split(":");
            return {
              minQty: parseInt((minQtyRaw || "1").trim(), 10) || 1,
              pricePerUnit: parseFloat((priceRaw || "0").trim()) || 0,
            };
          })
          .sort((a, b) => a.minQty - b.minQty);

  // parse quantity options CSV -> array of numbers
  const parseQtyOptionsCSV = (csv) =>
    !csv
      ? []
      : csv
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n) && n > 0)
          .sort((a, b) => a - b);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (
      !form.name ||
      !form.categoryId ||
      form.basePrice === "" ||
      form.basePrice === null
    ) {
      return toast.error("Please enter name, category and base price.");
    }

    try {
      submittingRef.current = true;

      // prepare attributes
      const transformedAttributes = form.attributes.map((attr) => {
        const values =
          Array.isArray(attr.values) &&
          attr.values.length > 0 &&
          typeof attr.values[0] === "object"
            ? attr.values
            : parseValuesCSV(attr.valuesCSV || "");
        return {
          name: attr.name,
          type: attr.type,
          values, // array of {label, priceModifier}
          required: !!attr.required,
        };
      });

      // pricing tiers
      const transformedTiers = parseTiersCSV(form.pricingTiersCSV || "");

      // quantity options
      const b2bQtyOptions = parseQtyOptionsCSV(
        form.b2b_quantityOptionsCSV || ""
      );
      const b2cQtyOptions = parseQtyOptionsCSV(
        form.b2c_quantityOptionsCSV || ""
      );

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
      fd.append("productFor", form.productFor || "both");

      fd.append("attributes", JSON.stringify(transformedAttributes));
      fd.append("pricingTiers", JSON.stringify(transformedTiers));

      // Build B2B and B2C option objects
      const b2bOptions = {
        enabled: !!form.b2b_enabled,
        allowFileUpload: !!form.b2b_allowFileUpload,
        quantityOptions: b2bQtyOptions, // array of numbers
      };
      fd.append("b2bOptions", JSON.stringify(b2bOptions));

      const b2cOptions = {
        enabled: !!form.b2c_enabled,
        designUpload: !!form.b2c_designUpload,
        whatsappSupport: !!form.b2c_whatsapp,
        quantityOptions: b2cQtyOptions, // optional array of numbers
      };
      fd.append("b2cOptions", JSON.stringify(b2cOptions));

      // files
      if (mainImageFile) fd.append("mainImage", mainImageFile);
      galleryFiles.forEach((f) => fd.append("gallery", f));

      const res = await axios.post("/api/products", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Product created");
      // reset
      setForm({
        name: "",
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
        productFor: "both",
        attributes: [],
        pricingTiersCSV: "",
        b2b_enabled: false,
        b2b_allowFileUpload: true,
        b2b_quantityOptionsCSV: "",
        b2c_enabled: true,
        b2c_designUpload: true,
        b2c_whatsapp: true,
        b2c_quantityOptionsCSV: "",
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

  // attribute helpers
  const addAttribute = () =>
    setForm((f) => ({
      ...f,
      attributes: [
        ...f.attributes,
        { name: "", type: "select", valuesCSV: "", required: false },
      ],
    }));

  const updateAttribute = (idx, patch) =>
    setForm((f) => {
      const copy = [...f.attributes];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...f, attributes: copy };
    });

  const removeAttribute = (idx) =>
    setForm((f) => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== idx),
    }));

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
          <h1 className="mb-4">Add Products</h1>

          <div className="add-product-page">
            {/* Categories */}
            <section className="category-section">
              <h3>Categories</h3>
              <div className="category-inputs">
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className="category-select"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="category-new-input"
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-add-category"
                  onClick={createCategory}
                >
                  Add Category
                </button>
              </div>
            </section>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Left Column */}
                <div className="form-left">
                  <input
                    name="name"
                    placeholder="Product Name"
                    value={form.name}
                    onChange={handleChange}
                    className="input-primary"
                    required
                  />

                  <div className="short-desc-row">
                    <input
                      name="shortDescription"
                      placeholder="Short Description"
                      value={form.shortDescription}
                      onChange={handleChange}
                      className="input-primary"
                    />
                    <select
                      name="productFor"
                      value={form.productFor}
                      onChange={handleChange}
                      className="select-primary"
                    >
                      <option value="both">Both (B2B & B2C)</option>
                      <option value="b2b">B2B only</option>
                      <option value="b2c">B2C only</option>
                    </select>
                  </div>

                  {/* Attributes Section */}
                  <div className="attributes-section">
                    <h4>Custom Attributes</h4>
                    <p className="note">
                      CSV format: <code>Label:modifier</code>, e.g.{" "}
                      <code>Single-Sided:0,Double-Sided:5</code>
                    </p>

                    {form.attributes.map((attr, i) => (
                      <div className="attribute-card" key={i}>
                        <div className="attribute-row">
                          <input
                            placeholder="Attribute Name"
                            value={attr.name}
                            onChange={(e) =>
                              updateAttribute(i, { name: e.target.value })
                            }
                          />
                          <select
                            value={attr.type}
                            onChange={(e) =>
                              updateAttribute(i, { type: e.target.value })
                            }
                          >
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                          </select>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!attr.required}
                              onChange={(e) =>
                                updateAttribute(i, {
                                  required: e.target.checked,
                                })
                              }
                            />{" "}
                            Required
                          </label>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => removeAttribute(i)}
                          >
                            Delete
                          </button>
                        </div>
                        <input
                          placeholder="e.g. Single-Sided:0,Double-Sided:5"
                          className="attribute-values"
                          value={
                            attr.valuesCSV ||
                            attr.values
                              ?.map((v) => `${v.label}:${v.priceModifier}`)
                              .join(",") ||
                            ""
                          }
                          onChange={(e) =>
                            updateAttribute(i, { valuesCSV: e.target.value })
                          }
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn add-attribute-btn"
                      onClick={addAttribute}
                    >
                      ➕ Add Attribute
                    </button>
                  </div>

                  {/* Description Editors */}
                  <label>Description</label>
                  <ReactQuill
                    value={form.description}
                    onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                    theme="snow"
                  />

                  <label className="mt-3">Our Specialization</label>
                  <ReactQuill
                    value={form.ourSpecialization}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, ourSpecialization: v }))
                    }
                    theme="snow"
                  />

                  <label className="mt-3">Important Notes</label>
                  <ReactQuill
                    value={form.importantNotes}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, importantNotes: v }))
                    }
                    theme="snow"
                  />

                  {/* Pricing */}
                  <div className="pricing-row mt-3">
                    <div>
                      <label>Base Price</label>
                      <input
                        name="basePrice"
                        value={form.basePrice}
                        onChange={handleChange}
                        type="number"
                        className="input-primary"
                        required
                      />
                    </div>
                    <div>
                      <label>Sale Price</label>
                      <input
                        name="salePrice"
                        value={form.salePrice}
                        onChange={handleChange}
                        type="number"
                        className="input-primary"
                      />
                    </div>
                  </div>

                  <div className="sku-stock-row">
                    <div>
                      <label>SKU</label>
                      <input
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        className="input-primary"
                      />
                    </div>
                    <div>
                      <label>Stock</label>
                      <input
                        name="stock"
                        value={form.stock}
                        onChange={handleChange}
                        type="number"
                        className="input-primary"
                      />
                    </div>
                    <div>
                      <label>Status</label>
                      <select
                        name="stockStatus"
                        value={form.stockStatus}
                        onChange={handleChange}
                        className="select-primary"
                      >
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="preorder">Preorder</option>
                      </select>
                    </div>
                  </div>

                  <div className="min-order-row">
                    <label>Min Order Qty</label>
                    <input
                      name="minOrderQty"
                      value={form.minOrderQty}
                      onChange={handleChange}
                      type="number"
                      className="input-primary"
                    />
                    <label>
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={form.isFeatured}
                        onChange={handleChange}
                      />{" "}
                      Featured
                    </label>
                  </div>

                  <label>Quantity Pricing Tiers</label>
                  <input
                    placeholder="e.g. 1:10,50:8,100:6"
                    value={form.pricingTiersCSV || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pricingTiersCSV: e.target.value,
                      }))
                    }
                    className="input-primary"
                  />

                  {/* B2B / B2C Options */}
                  <div className="b2b-section">
                    <h4>B2B Options</h4>
                    <label>
                      <input
                        type="checkbox"
                        name="b2b_enabled"
                        checked={form.b2b_enabled}
                        onChange={handleChange}
                      />{" "}
                      Enable B2B
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="b2b_allowFileUpload"
                        checked={form.b2b_allowFileUpload}
                        onChange={handleChange}
                      />{" "}
                      Allow file upload
                    </label>
                    <input
                      placeholder="Quantity options (comma separated)"
                      value={form.b2b_quantityOptionsCSV}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          b2b_quantityOptionsCSV: e.target.value,
                        }))
                      }
                      className="input-primary"
                    />
                  </div>

                  <div className="b2c-section">
                    <h4>B2C Options</h4>
                    <label>
                      <input
                        type="checkbox"
                        name="b2c_enabled"
                        checked={form.b2c_enabled}
                        onChange={handleChange}
                      />{" "}
                      Enable B2C
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="b2c_designUpload"
                        checked={form.b2c_designUpload}
                        onChange={handleChange}
                      />{" "}
                      Allow design upload
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="b2c_whatsapp"
                        checked={form.b2c_whatsapp}
                        onChange={handleChange}
                      />{" "}
                      WhatsApp support
                    </label>
                    <input
                      placeholder="Fixed quantity options (comma separated)"
                      value={form.b2c_quantityOptionsCSV}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          b2c_quantityOptionsCSV: e.target.value,
                        }))
                      }
                      className="input-primary"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-right">
                  <div className="image-upload-section">
                    <label>Main Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImage}
                      className="file-input"
                    />
                    {previewMain && (
                      <img
                        src={previewMain}
                        alt="preview"
                        className="image-preview"
                      />
                    )}

                    <label>Gallery Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGallery}
                      className="file-input"
                    />
                    <div className="gallery-preview">
                      {previewGallery.map((p, i) => (
                        <img key={i} src={p} alt="gallery" />
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn save-btn">
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
