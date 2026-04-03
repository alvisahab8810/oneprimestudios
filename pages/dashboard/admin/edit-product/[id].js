"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell } from "react-icons/fa";
import CategorySelect from "@/components/admin-panel/CategorySelect";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [productLoaded, setProductLoaded] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
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
    hsnCode: "",       // NEW: HSN/SAC code for invoicing
    productFor: "both",
    status: "draft",
    attributes: [],
     pricingTiers: [],   // ✅ ADD THIS
    // pricingTiersCSV: "",
    // b2b/b2c
    b2b_enabled: false,
    b2b_allowFileUpload: true,
    b2b_quantityOptionsCSV: "",
    b2c_enabled: false,
    b2c_designUpload: true,
    b2c_whatsapp: true,
    b2c_quantityOptionsCSV: "",
  });

  // images
  const [mainImageFile, setMainImageFile] = useState(null);
  const [previewMain, setPreviewMain] = useState(null);

  const [newGalleryFiles, setNewGalleryFiles] = useState([]); // files to upload
  const [previewNewGallery, setPreviewNewGallery] = useState([]);

  // existing gallery (strings of paths) and the removed set
  const [existingGallery, setExistingGallery] = useState([]); // current kept ones
  const [removedGallery, setRemovedGallery] = useState([]); // removed ones

  const submittingRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    fetchCategories();
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/categories");
      setCategories(res.data || []);
    } catch (err) {
      console.error("fetchCategories:", err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/products/${id}`);
      const p = res.data;

      const normalizedPricingTiers = Array.isArray(p.pricingTiers)
  ? p.pricingTiers.map((t) => ({
      minQty: t.minQty ?? "",
      pricePerUnit: t.pricePerUnit ?? "",
    }))
  : [];


      const normalizedAttributes = (p.attributes || []).map((attr) => ({
  name: attr.name || "",
  type: attr.type || "select",
  required: !!attr.required,

  // convert backend "values" → frontend "options"
  options: Array.isArray(attr.values)
    ? attr.values.map((v) => ({
        label: v.label,
        priceModifier: v.priceModifier,
      }))
    : [],

  // normalize upload rules
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
              : { unit: "px", values: "" },
        }
      : undefined,
}));


      // Pre-fill form from product
      setForm((prev) => ({
        ...prev,
        name: p.name || "",
        slug: p.slug || "",
        shortDescription: p.shortDescription || "",
        description: p.description || "",
        ourSpecialization: p.ourSpecialization || "",
        importantNotes: p.importantNotes || "",
        categoryId: p.category?._id || p.category || "",
        basePrice: p.basePrice || "",
        salePrice: p.salePrice || "",
        sku: p.sku || "",
        stock: p.stock || 0,
        stockStatus: p.stockStatus || "in_stock",
        minOrderQty: p.minOrderQty || 1,
        isFeatured: !!p.isFeatured,
        gstPercent: p.gstPercent || 0,
        hsnCode: p.hsnCode || "",         // NEW
        productFor: p.productFor || "both",
        status: p.status || "draft",
        // attributes: p.attributes || [],
        attributes: normalizedAttributes,
       pricingTiers: normalizedPricingTiers,
        b2b_enabled: !!(p.b2bOptions && p.b2bOptions.enabled),
        b2b_allowFileUpload: !!(p.b2bOptions && p.b2bOptions.allowFileUpload),
        b2c_enabled: !!(p.b2cOptions && p.b2cOptions.enabled),
        b2c_designUpload: !!(p.b2cOptions && p.b2cOptions.designUpload),
        b2c_whatsapp: !!(p.b2cOptions && p.b2cOptions.whatsappSupport),
      }));

      setPreviewMain(p.mainImage || null);
      setExistingGallery(Array.isArray(p.gallery) ? p.gallery : []);
      setProductLoaded(true);
    } catch (err) {
      console.error("fetchProduct:", err);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  // basic change handler for inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // main image change
  const handleMainImage = (e) => {
    const f = e.target.files[0];
    setMainImageFile(f);
    setPreviewMain(f ? URL.createObjectURL(f) : previewMain);
  };

  // add new gallery files
  const handleNewGallery = (e) => {
    const files = Array.from(e.target.files || []);
    setNewGalleryFiles((prev) => [...prev, ...files]);
    setPreviewNewGallery((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  // remove an existing gallery image (toggle remove)
  const toggleRemoveExistingGallery = (img) => {
    if (removedGallery.includes(img)) {
      setRemovedGallery((prev) => prev.filter((x) => x !== img));
      setExistingGallery((prev) => [...prev, img]);
    } else {
      setRemovedGallery((prev) => [...prev, img]);
      setExistingGallery((prev) => prev.filter((x) => x !== img));
    }
  };

  // remove a newly added gallery file (before upload)
  const removeNewGalleryFile = (index) => {
    setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewNewGallery((prev) => prev.filter((_, i) => i !== index));
  };

  // attribute helpers (same as add product)
  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, {
  name: "",
  type: "select",
  required: false,
  options: [],
  uploadRules: {
    imageDimensions: { unit: "px", values: "" },
  },
}

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

  // parse tiers to string helper
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

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!form.name || !form.categoryId || form.basePrice === "" || form.basePrice === null) {
      return toast.error("Please enter name, category and base price.");
    }

    try {
      submittingRef.current = true;
      const fd = new FormData();

      fd.append("name", form.name);
      fd.append("slug", form.slug || "");
      fd.append("shortDescription", form.shortDescription || "");
      fd.append("description", form.description || "");
      fd.append("ourSpecialization", form.ourSpecialization || "");
      fd.append("importantNotes", form.importantNotes || "");
      fd.append("categoryId", form.categoryId);
      fd.append("basePrice", String(form.basePrice));
      if (form.salePrice !== "" && form.salePrice !== null) fd.append("salePrice", String(form.salePrice));
      fd.append("sku", form.sku || "");
      fd.append("stock", String(form.stock || 0));
      fd.append("stockStatus", form.stockStatus || "in_stock");
      fd.append("minOrderQty", String(form.minOrderQty || 1));
      fd.append("isFeatured", String(form.isFeatured));
      fd.append("gstPercent", String(form.gstPercent || 0));
      fd.append("hsnCode", form.hsnCode || "");   // NEW
      fd.append("productFor", form.productFor || "both");
      fd.append("status", form.status || "draft");

      // attributes & pricing
      // fd.append("attributes", JSON.stringify(form.attributes || []));

      const transformedAttributes = form.attributes.map((attr) => {
  const rawOptions = Array.isArray(attr.options) ? attr.options : [];

  const values = rawOptions.map((o) => ({
    label: String(o.label || "").trim(),
    priceModifier: Number(o.priceModifier || 0),
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
            imageDimensions: attr.uploadRules?.imageDimensions || null,
          }
        : undefined,
  };
});

fd.append("attributes", JSON.stringify(transformedAttributes));

      fd.append(
  "pricingTiers",
  JSON.stringify(form.pricingTiers || [])
);


      // b2b/b2c
      const b2bOptions = {
        enabled: !!form.b2b_enabled,
        allowFileUpload: !!form.b2b_allowFileUpload,
        quantityOptions: form.b2b_quantityOptionsCSV ? form.b2b_quantityOptionsCSV.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n)) : [],
      };
      fd.append("b2bOptions", JSON.stringify(b2bOptions));

      const b2cOptions = {
        enabled: !!form.b2c_enabled,
        designUpload: !!form.b2c_designUpload,
        whatsappSupport: !!form.b2c_whatsapp,
        quantityOptions: form.b2c_quantityOptionsCSV ? form.b2c_quantityOptionsCSV.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n)) : [],
      };
      fd.append("b2cOptions", JSON.stringify(b2cOptions));

      // existing gallery: pass the kept images as comma-separated string
      fd.append("existingGallery", (existingGallery || []).join(","));

      // files
      if (mainImageFile) fd.append("mainImage", mainImageFile);
      newGalleryFiles.forEach((f) => fd.append("gallery", f));

      // send to update endpoint
      const res = await axios.put(`/api/products/update/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Product updated");
      // redirect back to admin product list
      router.push("/dashboard/admin/products");
    } catch (err) {
      console.error("Edit product submit:", err);
      toast.error(err.response?.data?.message || "Error updating product");
    } finally {
      submittingRef.current = false;
    }
  };

  if (!productLoaded) {
    return (
      <div className="d-flex">
        <Sidebar sidebarOpen={sidebarOpen} />
        <div style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }} className="p-4">
          <h3>Loading product...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
          <button className="btn btn-outline-primary me-3" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3" size={20} />
            <div className="dropdown">
              <button className="btn btn-secondary dropdown-toggle" type="button" id="profileDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                Admin
              </button>
            </div>
          </div>
        </nav>

        <div className="container-fluid p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-4">Edit Product</h1>
            <div>
              <Link href="/dashboard/admin/products" className="btn btn-outline-secondary me-2">Back to list</Link>
              <button className="btn btn-primary" onClick={handleSubmit}>Save Changes</button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Left column */}
              <div className="form-left">
                {/* product type */}
                <select name="productFor" value={form.productFor} onChange={handleChange} className="select-primary mb-2">
                  <option value="b2b">B2B only</option>
                  <option value="b2c">B2C only</option>
                  <option value="both">Both</option>
                </select>

                <input name="name" placeholder="Product Name" value={form.name} onChange={(e) => { handleChange(e); }} className="input-primary" required />

                {/* Slug (manual editable) */}
                <label className="mt-2">Slug (editable)</label>
                <input name="slug" value={form.slug} onChange={handleChange} className="input-primary mb-2" />

                {/* <label>Short Description</label> */}
                {/* <input name="shortDescription" value={form.shortDescription} onChange={handleChange} className="input-primary" /> */}

                <label className="mt-3">Description</label>
                <ReactQuill value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} theme="snow" />

                <label className="mt-3">Our Specialization</label>
                <ReactQuill value={form.ourSpecialization} onChange={(v) => setForm((p) => ({ ...p, ourSpecialization: v }))} theme="snow" />

                <label className="mt-3">Important Notes</label>
                <ReactQuill value={form.importantNotes} onChange={(v) => setForm((p) => ({ ...p, importantNotes: v }))} theme="snow" />

                {/* Pricing */}
                <div className="pricing-row mt-3 d-flex gap-3">
                  <div>
                    <label>Base Price</label>
                    <input name="basePrice" value={form.basePrice} onChange={handleChange} type="number" className="input-primary" required />
                  </div>
                  <div>
                    <label>Sale Price</label>
                    <input name="salePrice" value={form.salePrice} onChange={handleChange} type="number" className="input-primary" />
                  </div>
                </div>

                <div className="pricing-row mt-3 d-flex gap-3">
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

                <div className="sku-stock-row d-flex gap-3 mt-3">
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

                <div className="min-order-row mt-3">
                  <label>Min Order Qty</label>
                  <input name="minOrderQty" value={form.minOrderQty} onChange={handleChange} type="number" className="input-primary" />
                  <label className="ms-3">
                    <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} /> Featured
                  </label>
                </div>

                {/* <label className="mt-3">Quantity Pricing Tiers</label> */}
                {/* <input placeholder="e.g. 1:10,50:8,100:6" value={form.pricingTiersCSV || ""} onChange={(e) => setForm((f) => ({ ...f, pricingTiersCSV: e.target.value }))} className="input-primary" /> */}

                <label className="mt-3">Quantity Pricing Tiers</label>

{form.pricingTiers?.map((tier, index) => (
  <div key={index} className="flex gap-2 mb-2">
    <input
      type="number"
      placeholder="Min Qty"
      className="input-primary w-1/2"
      value={tier.minQty}
      onChange={(e) => {
        const updated = [...form.pricingTiers];
        updated[index].minQty = e.target.value;
        setForm((f) => ({ ...f, pricingTiers: updated }));
      }}
    />

    <input
      type="number"
      placeholder="Price"
      className="input-primary w-1/2"
      value={tier.pricePerUnit}
      onChange={(e) => {
        const updated = [...form.pricingTiers];
        updated[index].pricePerUnit = e.target.value;
        setForm((f) => ({ ...f, pricingTiers: updated }));
      }}
    />

    <button
      type="button"
      onClick={() => {
        const updated = [...form.pricingTiers];
        updated.splice(index, 1);
        setForm((f) => ({ ...f, pricingTiers: updated }));
      }}
      className="bg-red-500 text-white px-2 rounded"
    >
      X
    </button>
  </div>
))}

<button
  type="button"
  className="bg-green-500 text-white px-4 py-1 rounded"
  onClick={() =>
    setForm((f) => ({
      ...f,
      pricingTiers: [
        ...(f.pricingTiers || []),
        { minQty: "", pricePerUnit: "" },
      ],
    }))
  }
>
  + Add Tier
</button>






                {/* Attributes */}

                <div className="attributes-section">
                    <h4>Custom Attributes</h4>

                    {form.attributes.map((attr, i) => (
                      <div
                        key={i}
                        className="attribute-card mb-3 p-3 border rounded"
                      >
                        {/* Attribute Name + Type + Required */}
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Attribute Name (e.g. Side)"
                            value={attr.name}
                            onChange={(e) =>
                              updateAttribute(i, { name: e.target.value })
                            }
                          />
                          <select
                            className="form-select"
                            value={attr.type}
                            onChange={(e) =>
                              updateAttribute(i, { type: e.target.value })
                            }
                          >
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="upload">Upload File</option>{" "}
                            {/* ⭐ NEW */}
                          </select>

                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!attr.required}
                              onChange={(e) =>
                                updateAttribute(i, {
                                  required: e.target.checked,
                                })
                              }
                            />
                            <label className="form-check-label">Required</label>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => removeAttribute(i)}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Attribute Options */}
                        <div className="options-section ms-3">
                          <label className="fw-bold">Options:</label>
                          {attr.options?.map((opt, j) => (
                            <div
                              key={j}
                              className="d-flex align-items-center gap-2 mb-2"
                            >
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Option Label (e.g. Single Side)"
                                value={opt.label}
                                onChange={(e) => {
                                  const newOptions = [...attr.options];
                                  newOptions[j].label = e.target.value;
                                  updateAttribute(i, { options: newOptions });
                                }}
                              />
                              <input
                                type="number"
                                className="form-control"
                                placeholder="Price Modifier (₹)"
                                value={opt.priceModifier}
                                onChange={(e) => {
                                  const newOptions = [...attr.options];
                                  newOptions[j].priceModifier = e.target.value;
                                  updateAttribute(i, { options: newOptions });
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  const newOptions = attr.options.filter(
                                    (_, idx) => idx !== j
                                  );
                                  updateAttribute(i, { options: newOptions });
                                }}
                              >
                                ❌
                              </button>
                            </div>
                          ))}

                          {attr.type === "upload" && (
                            <div className="upload-rules-section mt-3 p-3 border rounded bg-light">
                              <h6 className="fw-bold mb-2">Upload Rules</h6>

                              {/* Required Upload */}
                              <div className="form-check mb-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={attr.uploadRules?.required || false}
                                  onChange={(e) =>
                                    updateAttribute(i, {
                                      uploadRules: {
                                        ...attr.uploadRules,
                                        required: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                <label className="form-check-label">
                                  Mandatory File Upload
                                </label>
                              </div>

                              {/* Acceptable File Types */}
                              <label className="fw-bold">
                                Accepted File Types
                              </label>
                              <input
                                type="text"
                                className="form-control mb-2"
                                placeholder="e.g. png,jpg,pdf"
                                value={(
                                  attr.uploadRules?.acceptTypes || []
                                ).join(",")}
                                onChange={(e) =>
                                  updateAttribute(i, {
                                    uploadRules: {
                                      ...attr.uploadRules,
                                      acceptTypes: e.target.value
                                        .split(",")
                                        .map((s) => s.trim()),
                                    },
                                  })
                                }
                              />

                              {/* Max Size */}
                              <label className="fw-bold">
                                Max File Size (MB)
                              </label>
                              <input
                                type="number"
                                className="form-control mb-2"
                                placeholder="Max Size"
                                value={attr.uploadRules?.maxSizeMB || 5}
                                onChange={(e) =>
                                  updateAttribute(i, {
                                    uploadRules: {
                                      ...attr.uploadRules,
                                      maxSizeMB: Number(e.target.value),
                                    },
                                  })
                                }
                              />

                              {/* Image Dimensions (optional) */}
                              <label className="fw-bold mt-2">
                                Allowed Image Dimensions (comma separated)
                              </label>
                              {/* <input
                                type="text"
                                className="form-control mb-2"
                                placeholder="e.g. 1280x760,760x540 (leave empty to skip dimension check)"
                                value={attr.uploadRules?.imageDimensions || ""}
                                onChange={(e) =>
                                  updateAttribute(i, {
                                    uploadRules: {
                                      ...attr.uploadRules,
                                      imageDimensions: e.target.value, // store as raw string
                                    },
                                  })
                                }
                              /> */}



                              {/* Dimension Unit */}
                                <label className="fw-bold mt-2">Dimension Unit</label>
                                <select
                                  className="form-select mb-2"
                                  value={attr.uploadRules?.imageDimensions?.unit || "px"}
                                  onChange={(e) =>
                                    updateAttribute(i, {
                                      uploadRules: {
                                        ...attr.uploadRules,
                                        imageDimensions: {
                                          unit: e.target.value,
                                          values: attr.uploadRules?.imageDimensions?.values || "",
                                        },
                                      },
                                    })
                                  }
                                >
                                  <option value="px">Pixels (px)</option>
                                  <option value="mm">Millimeter (mm)</option>
                                  <option value="inch">Inch (in)</option>
                                </select>

                                {/* Dimension Values */}
                                <label className="fw-bold">Allowed Dimensions</label>
                                <input
                                  type="text"
                                  className="form-control mb-2"
                                  placeholder="e.g. 1280x760 or 210x297"
                                  value={attr.uploadRules?.imageDimensions?.values || ""}
                                  onChange={(e) =>
                                    updateAttribute(i, {
                                      uploadRules: {
                                        ...attr.uploadRules,
                                        imageDimensions: {
                                          unit: attr.uploadRules?.imageDimensions?.unit || "px",
                                          values: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                />

                                <small className="text-muted">
                                  Enter width x height. Unit depends on selection above.
                                </small>

                              <small className="text-muted">
                                Enter widthxheight values separated by commas.
                                Users must upload an image matching one of these
                                exactly.
                              </small>

                              {/* Upload Side */}
                              <label className="fw-bold">Upload For</label>
                              <select
                                className="form-select"
                                value={attr.uploadRules?.uploadFor || "all"}
                                onChange={(e) =>
                                  updateAttribute(i, {
                                    uploadRules: {
                                      ...attr.uploadRules,
                                      uploadFor: e.target.value,
                                    },
                                  })
                                }
                              >
                                <option value="front">Front</option>
                                <option value="back">Back</option>
                                <option value="all">All</option>
                              </select>
                            </div>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              const newOptions = attr.options
                                ? [
                                    ...attr.options,
                                    { label: "", priceModifier: 0 },
                                  ]
                                : [{ label: "", priceModifier: 0 }];
                              updateAttribute(i, { options: newOptions });
                            }}
                          >
                            ➕ Add Option
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-primary mt-3"
                      onClick={addAttribute}
                    >
                      ➕ Add Attribute
                    </button>
                  </div>
             

                {/* B2B/B2C Sections */}
                <div className="b2b-section mt-3">
                  <h4>B2B Options</h4>
                  <label><input type="checkbox" name="b2b_enabled" checked={form.b2b_enabled} onChange={handleChange} /> Enable B2B</label>
                  {form.b2b_enabled && (
                    <>
                      <label className="d-block mt-2"><input type="checkbox" name="b2b_allowFileUpload" checked={form.b2b_allowFileUpload} onChange={handleChange} /> Allow file upload</label>
                      <input placeholder="Quantity options (comma separated)" value={form.b2b_quantityOptionsCSV} onChange={(e) => setForm(f => ({ ...f, b2b_quantityOptionsCSV: e.target.value }))} className="input-primary mt-2" />
                    </>
                  )}
                </div>

                <div className="b2c-section mt-3">
                  <h4>B2C Options</h4>
                  <label><input type="checkbox" name="b2c_enabled" checked={form.b2c_enabled} onChange={handleChange} /> Enable B2C</label>
                  {form.b2c_enabled && (
                    <>
                      <label className="d-block mt-2"><input type="checkbox" name="b2c_designUpload" checked={form.b2c_designUpload} onChange={handleChange} /> Allow design upload</label>
                      <label className="d-block mt-2"><input type="checkbox" name="b2c_whatsapp" checked={form.b2c_whatsapp} onChange={handleChange} /> WhatsApp support</label>
                      <input placeholder="Fixed quantity options (comma separated)" value={form.b2c_quantityOptionsCSV} onChange={(e) => setForm(f => ({ ...f, b2c_quantityOptionsCSV: e.target.value }))} className="input-primary mt-2" />
                    </>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="form-right">
                <div className="category-section mb-3">
                  <h5>Category</h5>
                  {/* <select name="categoryId" value={form.categoryId} onChange={handleChange} className="form-select">
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select> */}

                  <CategorySelect
  value={form.categoryId}
  onChange={(id) => setForm(f => ({ ...f, categoryId: id }))}
/>
                </div>

                <div className="image-upload-section">
                  <label>Main Image</label>
                  <input type="file" accept="image/*" onChange={handleMainImage} className="file-input" />
                  {previewMain && <img src={previewMain} alt="preview" className="image-preview mb-2" style={{ width: "100%", borderRadius: 8 }} />}
                </div>

                <div className="gallery-section mt-3">
                  <label>Existing Gallery</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {existingGallery.length === 0 && <div className="text-muted">No gallery images</div>}
                    {existingGallery.map((img) => (
                      <div key={img} style={{ position: "relative", width: 120 }}>
                        <img src={img} alt="gallery" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6 }} />
                        <button type="button" className={`btn btn-sm ${removedGallery.includes(img) ? "btn-outline-success" : "btn-outline-danger"}`} style={{ position: "absolute", right: 4, top: 4 }} onClick={() => toggleRemoveExistingGallery(img)}>
                          {removedGallery.includes(img) ? "Undo" : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>

                  <label>Add New Gallery Images</label>
                  <input type="file" accept="image/*" multiple onChange={handleNewGallery} className="file-input" />
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {previewNewGallery.map((p, i) => (
                      <div key={i} style={{ position: "relative", width: 120 }}>
                        <img src={p} alt="new" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6 }} />
                        <button type="button" className="btn btn-sm btn-outline-danger" style={{ position: "absolute", right: 4, top: 4 }} onClick={() => removeNewGalleryFile(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="form-select">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="mt-3">
                  <button type="submit" className="btn save-btn w-100" onClick={handleSubmit}>
                    Save Product
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
