
// // pages/admin/add-product.js
// import { useEffect, useState } from "react";
// import axios from "axios";
// import dynamic from "next/dynamic";
// import toast from "react-hot-toast";

// const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// export default function AddProduct() {
//   const [categories, setCategories] = useState([]);
//   const [newCategory, setNewCategory] = useState("");

//   const [form, setForm] = useState({
//     name: "",
//     shortDescription: "",
//     description: "",
//     ourSpecialization: "",
//     importantNotes: "",
//     categoryId: "",
//     regularPrice: "",
//     salePrice: "",
//     sku: "",
//     stock: 0,
//     stockStatus: "in_stock",
//     minOrderQty: 1,
//     isFeatured: false,
//     // option textareas (comma-separated)
//     attributes: [],   // ✅ new
//     b2b_quantity: "",
//     b2b_colors: "",
//     b2b_finishes: "",
//     b2b_packing: "",
//     b2b_enabled: false,
//     b2c_enabled: true,
//     b2c_whatsapp: true
//   });

//   const [mainImageFile, setMainImageFile] = useState(null);
//   const [galleryFiles, setGalleryFiles] = useState([]);
//   const [previewMain, setPreviewMain] = useState(null);
//   const [previewGallery, setPreviewGallery] = useState([]);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       const res = await axios.get("/api/categories");
//       setCategories(res.data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const createCategory = async () => {
//     if (!newCategory.trim()) return toast.error("Enter category name");
//     try {
//       const res = await axios.post("/api/categories", { name: newCategory.trim() });
//       toast.success("Category added");
//       setCategories((c) => [...c, res.data]);
//       setNewCategory("");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error creating category");
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
//   };

//   const handleMainImage = (e) => {
//     const f = e.target.files[0];
//     setMainImageFile(f);
//     setPreviewMain(URL.createObjectURL(f));
//   };

//   const handleGallery = (e) => {
//     const files = Array.from(e.target.files);
//     setGalleryFiles(files);
//     setPreviewGallery(files.map((f) => URL.createObjectURL(f)));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.name || !form.categoryId || !form.regularPrice) {
//       return toast.error("Please enter name, category and regular price.");
//     }

//     try {
//       const fd = new FormData();
//       fd.append("name", form.name);
//       fd.append("shortDescription", form.shortDescription);
//       fd.append("description", form.description); // HTML from Quill
//       fd.append("ourSpecialization", form.ourSpecialization);
//       fd.append("importantNotes", form.importantNotes);
//       fd.append("categoryId", form.categoryId);
//       fd.append("regularPrice", form.regularPrice);
//       fd.append("salePrice", form.salePrice || "");
//       fd.append("sku", form.sku || "");
//       fd.append("stock", form.stock);
//       fd.append("stockStatus", form.stockStatus);
//       fd.append("minOrderQty", form.minOrderQty);
//       fd.append("isFeatured", form.isFeatured);
//       fd.append("ourSpecialization", form.ourSpecialization || "");
//       fd.append("importantNotes", form.importantNotes || "");
//       fd.append("attributes", JSON.stringify(form.attributes));

//       // b2b / b2c options as JSON
//       const b2bOptions = {
//         enabled: form.b2b_enabled,
//         quantityOptions: form.b2b_quantity ? form.b2b_quantity.split(",").map((s) => Number(s.trim())) : [],
//         colorOptions: form.b2b_colors ? form.b2b_colors.split(",").map((s) => s.trim()) : [],
//         finishes: form.b2b_finishes ? form.b2b_finishes.split(",").map((s) => s.trim()) : [],
//         packingOptions: form.b2b_packing ? form.b2b_packing.split(",").map((s) => s.trim()) : [],
//         allowFileUpload: true
//       };
//       fd.append("b2bOptions", JSON.stringify(b2bOptions));

//       const b2cOptions = {
//         enabled: form.b2c_enabled,
//         whatsappSupport: form.b2c_whatsapp,
//         designUpload: true
//       };
//       fd.append("b2cOptions", JSON.stringify(b2cOptions));

//       // append files
//       if (mainImageFile) fd.append("mainImage", mainImageFile);
//       galleryFiles.forEach((f) => fd.append("gallery", f));

//       const res = await axios.post("/api/products", fd, {
//         headers: { "Content-Type": "multipart/form-data" }
//       });

//       toast.success("Product created");
//       // reset form
//       setForm({
//         name: "",
//         shortDescription: "",
//         description: "",
//         ourSpecialization: "",
//         importantNotes: "",
//         categoryId: "",
//         regularPrice: "",
//         salePrice: "",
//         sku: "",
//         stock: 0,
//         stockStatus: "in_stock",
//         minOrderQty: 1,
//         isFeatured: false,
//         attributes: [],   // ✅ reset attributes
//         b2b_quantity: "",
//         b2b_colors: "",
//         b2b_finishes: "",
//         b2b_packing: "",
//         b2b_enabled: false,
//         b2c_enabled: true,
//         b2c_whatsapp: true
//       });
//       setMainImageFile(null);
//       setGalleryFiles([]);
//       setPreviewMain(null);
//       setPreviewGallery([]);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Error creating product");
//     }
//   };

//   return (
//     <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
//       <h1>Add Product</h1>

//       <section style={{ marginBottom: 16 }}>
//         <h3>Categories</h3>
//         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <select name="categoryId" value={form.categoryId} onChange={handleChange}>
//             <option value="">Select category</option>
//             {categories.map((c) => (
//               <option key={c._id} value={c._id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//           <input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
//           <button type="button" onClick={createCategory}>
//             Add Category
//           </button>
//         </div>
//       </section>

//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
//           <div>
//             <input
//               name="name"
//               placeholder="Product Name"
//               value={form.name}
//               onChange={handleChange}
//               required
//               style={{ width: "100%", padding: 8, marginBottom: 8 }}
//             />
//             <input
//               name="shortDescription"
//               placeholder="Short Description"
//               value={form.shortDescription}
//               onChange={handleChange}
//               style={{ width: "100%", padding: 8, marginBottom: 8 }}
//             />


//             <hr style={{ margin: "16px 0" }} />
// <h4>Custom Attributes</h4>

// {form.attributes.map((attr, i) => (
//   <div key={i} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
//     <input
//       placeholder="Attribute Name (e.g. Size, Finish)"
//       value={attr.name}
//       onChange={(e) => {
//         const newAttrs = [...form.attributes];
//         newAttrs[i].name = e.target.value;
//         setForm((f) => ({ ...f, attributes: newAttrs }));
//       }}
//       style={{ marginRight: 8 }}
//     />

//     <select
//       value={attr.type}
//       onChange={(e) => {
//         const newAttrs = [...form.attributes];
//         newAttrs[i].type = e.target.value;
//         setForm((f) => ({ ...f, attributes: newAttrs }));
//       }}
//       style={{ marginRight: 8 }}
//     >
//       <option value="text">Text</option>
//       <option value="number">Number</option>
//       <option value="select">Select</option>
//       <option value="checkbox">Checkbox</option>
//     </select>

//     <input
//       placeholder="Values (comma separated if select/checkbox)"
//       value={attr.values.join(",")}
//       onChange={(e) => {
//         const newAttrs = [...form.attributes];
//         newAttrs[i].values = e.target.value.split(",").map((s) => s.trim());
//         setForm((f) => ({ ...f, attributes: newAttrs }));
//       }}
//       style={{ marginRight: 8 }}
//     />

//     <label>
//       <input
//         type="checkbox"
//         checked={attr.required}
//         onChange={(e) => {
//           const newAttrs = [...form.attributes];
//           newAttrs[i].required = e.target.checked;
//           setForm((f) => ({ ...f, attributes: newAttrs }));
//         }}
//       />
//       Required
//     </label>

//     <button
//       type="button"
//       style={{ marginLeft: 8 }}
//       onClick={() => {
//         setForm((f) => ({
//           ...f,
//           attributes: f.attributes.filter((_, idx) => idx !== i)
//         }));
//       }}
//     >
//       Delete
//     </button>
//   </div>
// ))}

// <button
//   type="button"
//   onClick={() =>
//     setForm((f) => ({
//       ...f,
//       attributes: [...f.attributes, { name: "", type: "text", values: [], required: false }]
//     }))
//   }
// >
//   ➕ Add Attribute
// </button>


//             <label style={{ display: "block", marginBottom: 6 }}>Full Description</label>
//             <ReactQuill
//               value={form.description}
//               onChange={(value) => setForm((p) => ({ ...p, description: value }))}
//               theme="snow"
//             />
//            <label style={{ display: "block", marginBottom: 6 }}>Our Specialization</label>
// <ReactQuill
//   value={form.ourSpecialization}
//   onChange={(value) =>
//     setForm((p) => ({ ...p, ourSpecialization: value }))
//   }
//   theme="snow"
// />

// <label style={{ display: "block", margin: "12px 0 6px" }}>
//   Important Notes
// </label>
// <ReactQuill
//   value={form.importantNotes}
//   onChange={(value) =>
//     setForm((p) => ({ ...p, importantNotes: value }))
//   }
//   theme="snow"
// />


//             <div style={{ marginTop: 12 }}>
//               <label>Regular Price</label>
//               <input
//                 name="regularPrice"
//                 value={form.regularPrice}
//                 onChange={handleChange}
//                 type="number"
//                 required
//                 style={{ width: "200px", padding: 8, marginRight: 8 }}
//               />
//               <label>Sale Price</label>
//               <input
//                 name="salePrice"
//                 value={form.salePrice}
//                 onChange={handleChange}
//                 type="number"
//                 style={{ width: "200px", padding: 8 }}
//               />
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <label>SKU</label>
//               <input name="sku" value={form.sku} onChange={handleChange} style={{ width: "220px", padding: 8 }} />
//               <label style={{ marginLeft: 12 }}>Stock</label>
//               <input
//                 name="stock"
//                 value={form.stock}
//                 onChange={handleChange}
//                 type="number"
//                 style={{ width: "120px", padding: 8 }}
//               />
//               <select
//                 name="stockStatus"
//                 value={form.stockStatus}
//                 onChange={handleChange}
//                 style={{ padding: 8, marginLeft: 8 }}
//               >
//                 <option value="in_stock">In Stock</option>
//                 <option value="out_of_stock">Out of Stock</option>
//                 <option value="preorder">Preorder</option>
//               </select>
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <label>Min Order Qty</label>
//               <input
//                 name="minOrderQty"
//                 value={form.minOrderQty}
//                 onChange={handleChange}
//                 type="number"
//                 style={{ width: "120px", padding: 8 }}
//               />
//               <label style={{ marginLeft: 12 }}>
//                 <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} /> Featured
//               </label>
//             </div>

//             <hr style={{ margin: "16px 0" }} />

//             <h4>B2B Options (optional)</h4>
//             <label>
//               <input type="checkbox" name="b2b_enabled" checked={form.b2b_enabled} onChange={handleChange} /> Enable B2B
//               options
//             </label>
//             <div>
//               <label>Quantity options (comma separated)</label>
//               <input
//                 name="b2b_quantity"
//                 value={form.b2b_quantity}
//                 onChange={handleChange}
//                 placeholder="50,100,200"
//                 style={{ width: "100%", padding: 8 }}
//               />
//               <label>Color options (comma separated)</label>
//               <input
//                 name="b2b_colors"
//                 value={form.b2b_colors}
//                 onChange={handleChange}
//                 placeholder="1 Color,2 Colors,Full Color"
//                 style={{ width: "100%", padding: 8 }}
//               />
//               <label>Finishes (comma separated)</label>
//               <input
//                 name="b2b_finishes"
//                 value={form.b2b_finishes}
//                 onChange={handleChange}
//                 placeholder="Glossy,Matte"
//                 style={{ width: "100%", padding: 8 }}
//               />
//               <label>Packing options (comma separated)</label>
//               <input
//                 name="b2b_packing"
//                 value={form.b2b_packing}
//                 onChange={handleChange}
//                 placeholder="Required,Not Required"
//                 style={{ width: "100%", padding: 8 }}
//               />
//             </div>

//             <hr style={{ margin: "16px 0" }} />

//             <h4>B2C Options</h4>
//             <label>
//               <input type="checkbox" name="b2c_enabled" checked={form.b2c_enabled} onChange={handleChange} /> Enable B2C
//             </label>
//             <label style={{ display: "block", marginTop: 8 }}>
//               <input type="checkbox" name="b2c_whatsapp" checked={form.b2c_whatsapp} onChange={handleChange} /> Show
//               WhatsApp support
//             </label>
//           </div>

//           <div>
//             <div>
//               <label>Main Image</label>
//               <input type="file" accept="image/*" onChange={handleMainImage} />
//               {previewMain && <img src={previewMain} alt="preview" style={{ width: "100%", marginTop: 8 }} />}
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <label>Gallery Images (multiple)</label>
//               <input type="file" accept="image/*" multiple onChange={handleGallery} />
//               <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
//                 {previewGallery.map((p, i) => (
//                   <img key={i} src={p} alt="g" style={{ width: 80, height: 80, objectFit: "cover" }} />
//                 ))}
//               </div>
//             </div>

//             <div style={{ marginTop: 24 }}>
//               <button type="submit" style={{ padding: "10px 16px" }}>
//                 Save Product
//               </button>
//             </div>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }









// import { useEffect, useState } from "react";
// import axios from "axios";
// import dynamic from "next/dynamic";
// import toast from "react-hot-toast";

// const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// export default function AddProduct() {
//   const [categories, setCategories] = useState([]);
//   const [newCategory, setNewCategory] = useState("");

//   const [form, setForm] = useState({
//     name: "",
//     shortDescription: "",
//     description: "",
//     ourSpecialization: "",
//     importantNotes: "",
//     categoryId: "",
//     basePrice: "", // ✅ correct
//     salePrice: "",
//     sku: "",
//     stock: 0,
//     stockStatus: "in_stock",
//     minOrderQty: 1,
//     isFeatured: false,
//     productFor: "both",

//     attributes: [],
//     pricingTiers: [],

//     b2b_enabled: false,
//     b2b_allowFileUpload: true,
//     b2c_enabled: true,
//     b2c_designUpload: true,
//     b2c_whatsapp: true,
//   });

//   const [mainImageFile, setMainImageFile] = useState(null);
//   const [galleryFiles, setGalleryFiles] = useState([]);
//   const [previewMain, setPreviewMain] = useState(null);
//   const [previewGallery, setPreviewGallery] = useState([]);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       const res = await axios.get("/api/categories");
//       setCategories(res.data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const createCategory = async () => {
//     if (!newCategory.trim()) return toast.error("Enter category name");
//     try {
//       const res = await axios.post("/api/categories", { name: newCategory.trim() });
//       toast.success("Category added");
//       setCategories((c) => [...c, res.data]);
//       setNewCategory("");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error creating category");
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
//   };

//   const handleMainImage = (e) => {
//     const f = e.target.files[0];
//     setMainImageFile(f);
//     setPreviewMain(URL.createObjectURL(f));
//   };

//   const handleGallery = (e) => {
//     const files = Array.from(e.target.files);
//     setGalleryFiles(files);
//     setPreviewGallery(files.map((f) => URL.createObjectURL(f)));
//   };

//   // parse "Label:modifier,Label2:modifier"
//   const parseValuesCSV = (csv) =>
//     !csv
//       ? []
//       : csv.split(",").map((s) => {
//           const [labelRaw, modRaw] = s.trim().split(":");
//           return {
//             label: (labelRaw || "").trim(),
//             priceModifier: parseFloat(modRaw || "0") || 0,
//           };
//         });

//   // parse "1:10,50:8,100:6"
//   const parseTiersCSV = (csv) =>
//     !csv
//       ? []
//       : csv
//           .split(",")
//           .map((s) => {
//             const [minQtyRaw, priceRaw] = s.trim().split(":");
//             return {
//               minQty: parseInt(minQtyRaw || "1", 10) || 1,
//               pricePerUnit: parseFloat(priceRaw || "0") || 0,
//             };
//           })
//           .sort((a, b) => a.minQty - b.minQty);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.name || !form.categoryId || form.basePrice === "" || form.basePrice === null) {
//       return toast.error("Please enter name, category and base price.");
//     }

//     try {
//       const transformedAttributes = form.attributes.map((attr) => {
//         const values =
//           Array.isArray(attr.values) && typeof attr.values[0] === "object"
//             ? attr.values
//             : parseValuesCSV(attr.valuesCSV || "");
//         return {
//           name: attr.name,
//           type: attr.type,
//           values,
//           required: !!attr.required,
//         };
//       });

//       const transformedTiers = parseTiersCSV(form.pricingTiersCSV || "");

//       const fd = new FormData();
//       fd.append("name", form.name);
//       fd.append("shortDescription", form.shortDescription);
//       fd.append("description", form.description || "");
//       fd.append("ourSpecialization", form.ourSpecialization || "");
//       fd.append("importantNotes", form.importantNotes || "");
//       fd.append("categoryId", form.categoryId); // ✅ fixed
//       fd.append("basePrice", String(form.basePrice)); // ✅ fixed
//       fd.append("salePrice", form.salePrice || "");
//       fd.append("sku", form.sku || "");
//       fd.append("stock", String(form.stock || 0));
//       fd.append("stockStatus", form.stockStatus || "in_stock");
//       fd.append("minOrderQty", String(form.minOrderQty || 1));
//       fd.append("isFeatured", String(form.isFeatured));
//       fd.append("productFor", form.productFor || "both");

//       fd.append("attributes", JSON.stringify(transformedAttributes));
//       fd.append("pricingTiers", JSON.stringify(transformedTiers));

//       const b2bOptions = {
//         enabled: form.b2b_enabled,
//         allowFileUpload: !!form.b2b_allowFileUpload,
//       };
//       fd.append("b2bOptions", JSON.stringify(b2bOptions));

//       const b2cOptions = {
//         enabled: form.b2c_enabled,
//         designUpload: !!form.b2c_designUpload,
//         whatsappSupport: !!form.b2c_whatsapp,
//       };
//       fd.append("b2cOptions", JSON.stringify(b2cOptions));

//       if (mainImageFile) fd.append("mainImage", mainImageFile);
//       galleryFiles.forEach((f) => fd.append("gallery", f));

//       const res = await axios.post("/api/products", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       toast.success("Product created");

//       // reset form
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
//         productFor: "both",
//         attributes: [],
//         pricingTiers: [],
//         b2b_enabled: false,
//         b2b_allowFileUpload: true,
//         b2c_enabled: true,
//         b2c_designUpload: true,
//         b2c_whatsapp: true,
//       });
//       setMainImageFile(null);
//       setGalleryFiles([]);
//       setPreviewMain(null);
//       setPreviewGallery([]);
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Error creating product");
//     }
//   };

//   // attribute helpers
//   const addAttribute = () =>
//     setForm((f) => ({
//       ...f,
//       attributes: [...f.attributes, { name: "", type: "select", valuesCSV: "", required: false }],
//     }));

//   const updateAttribute = (idx, patch) =>
//     setForm((f) => {
//       const copy = [...f.attributes];
//       copy[idx] = { ...copy[idx], ...patch };
//       return { ...f, attributes: copy };
//     });

//   const removeAttribute = (idx) =>
//     setForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== idx) }));

//   return (
//     <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
//       <h1>Add Product</h1>

//       {/* Categories */}
//       <section style={{ marginBottom: 16 }}>
//         <h3>Categories</h3>
//         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <select name="categoryId" value={form.categoryId} onChange={handleChange}>
//             <option value="">Select category</option>
//             {categories.map((c) => (
//               <option key={c._id} value={c._id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//           <input
//             placeholder="New category name"
//             value={newCategory}
//             onChange={(e) => setNewCategory(e.target.value)}
//           />
//           <button type="button" onClick={createCategory}>
//             Add Category
//           </button>
//         </div>
//       </section>

//       {/* Product Form */}
//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
//           <div>
//             <input
//               name="name"
//               placeholder="Product Name"
//               value={form.name}
//               onChange={handleChange}
//               required
//               style={{ width: "100%", padding: 8, marginBottom: 8 }}
//             />

//             <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
//               <input
//                 name="shortDescription"
//                 placeholder="Short Description"
//                 value={form.shortDescription}
//                 onChange={handleChange}
//                 style={{ flex: 1, padding: 8 }}
//               />
//               <select name="productFor" value={form.productFor} onChange={handleChange}>
//                 <option value="both">Both (B2B & B2C)</option>
//                 <option value="b2b">B2B only</option>
//                 <option value="b2c">B2C only</option>
//               </select>
//             </div>

//             <hr style={{ margin: "16px 0" }} />
//             <h4>Custom Attributes</h4>
//             <p style={{ fontSize: 13, color: "#444" }}>
//               CSV format: <code>Label:modifier</code>, e.g.{" "}
//               <code>Single-Sided:0,Double-Sided:5</code>
//             </p>

//             {form.attributes.map((attr, i) => (
//               <div key={i} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
//                 <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                   <input
//                     placeholder="Attribute Name"
//                     value={attr.name}
//                     onChange={(e) => updateAttribute(i, { name: e.target.value })}
//                     style={{ flex: 1, padding: 6 }}
//                   />
//                   <select
//                     value={attr.type}
//                     onChange={(e) => updateAttribute(i, { type: e.target.value })}
//                   >
//                     <option value="select">Select</option>
//                     <option value="checkbox">Checkbox</option>
//                     <option value="text">Text</option>
//                     <option value="number">Number</option>
//                   </select>
//                   <label>
//                     <input
//                       type="checkbox"
//                       checked={!!attr.required}
//                       onChange={(e) => updateAttribute(i, { required: e.target.checked })}
//                     />{" "}
//                     Required
//                   </label>
//                   <button type="button" onClick={() => removeAttribute(i)}>
//                     Delete
//                   </button>
//                 </div>

//                 <input
//                   placeholder="e.g. Single-Sided:0,Double-Sided:5"
//                   value={
//                     attr.valuesCSV ||
//                     attr.values?.map((v) => `${v.label}:${v.priceModifier}`).join(",") ||
//                     ""
//                   }
//                   onChange={(e) => updateAttribute(i, { valuesCSV: e.target.value })}
//                   style={{ width: "100%", padding: 8, marginTop: 6 }}
//                 />
//               </div>
//             ))}

//             <button type="button" onClick={addAttribute} style={{ marginBottom: 12 }}>
//               ➕ Add Attribute
//             </button>

//             <label>Description</label>
//             <ReactQuill
//               value={form.description}
//               onChange={(v) => setForm((p) => ({ ...p, description: v }))}
//               theme="snow"
//             />

//             <label>Our Specialization</label>
//             <ReactQuill
//               value={form.ourSpecialization}
//               onChange={(v) => setForm((p) => ({ ...p, ourSpecialization: v }))}
//               theme="snow"
//             />

//             <label>Important Notes</label>
//             <ReactQuill
//               value={form.importantNotes}
//               onChange={(v) => setForm((p) => ({ ...p, importantNotes: v }))}
//               theme="snow"
//             />

//             <div style={{ marginTop: 12 }}>
//               <label>Base Price</label>
//               <input
//                 name="basePrice"
//                 value={form.basePrice}
//                 onChange={handleChange}
//                 type="number"
//                 required
//                 style={{ width: "200px", padding: 8, marginRight: 8 }}
//               />
//               <label>Sale Price</label>
//               <input
//                 name="salePrice"
//                 value={form.salePrice}
//                 onChange={handleChange}
//                 type="number"
//                 style={{ width: "200px", padding: 8 }}
//               />
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <label>SKU</label>
//               <input name="sku" value={form.sku} onChange={handleChange} />
//               <label>Stock</label>
//               <input
//                 name="stock"
//                 value={form.stock}
//                 onChange={handleChange}
//                 type="number"
//                 style={{ width: "120px" }}
//               />
//               <select name="stockStatus" value={form.stockStatus} onChange={handleChange}>
//                 <option value="in_stock">In Stock</option>
//                 <option value="out_of_stock">Out of Stock</option>
//                 <option value="preorder">Preorder</option>
//               </select>
//             </div>

//             <label>Min Order Qty</label>
//             <input
//               name="minOrderQty"
//               value={form.minOrderQty}
//               onChange={handleChange}
//               type="number"
//             />
//             <label>
//               <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />{" "}
//               Featured
//             </label>

//             <hr />
//             <h4>Quantity Pricing Tiers</h4>
//             <input
//               placeholder="e.g. 1:10,50:8,100:6"
//               value={form.pricingTiersCSV || ""}
//               onChange={(e) => setForm((f) => ({ ...f, pricingTiersCSV: e.target.value }))}
//               style={{ width: "100%", padding: 8 }}
//             />

//             <hr />
//             <h4>B2B Options</h4>
//             <label>
//               <input type="checkbox" name="b2b_enabled" checked={form.b2b_enabled} onChange={handleChange} /> Enable B2B
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 name="b2b_allowFileUpload"
//                 checked={form.b2b_allowFileUpload}
//                 onChange={handleChange}
//               />{" "}
//               Allow file upload
//             </label>

//             <hr />
//             <h4>B2C Options</h4>
//             <label>
//               <input type="checkbox" name="b2c_enabled" checked={form.b2c_enabled} onChange={handleChange} /> Enable B2C
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 name="b2c_designUpload"
//                 checked={form.b2c_designUpload}
//                 onChange={handleChange}
//               />{" "}
//               Allow design upload
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 name="b2c_whatsapp"
//                 checked={form.b2c_whatsapp}
//                 onChange={handleChange}
//               />{" "}
//               WhatsApp support
//             </label>
//           </div>

//           <div>
//             <label>Main Image</label>
//             <input type="file" accept="image/*" onChange={handleMainImage} />
//             {previewMain && <img src={previewMain} alt="preview" style={{ width: "100%", marginTop: 8 }} />}

//             <label>Gallery Images</label>
//             <input type="file" accept="image/*" multiple onChange={handleGallery} />
//             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//               {previewGallery.map((p, i) => (
//                 <img key={i} src={p} alt="g" style={{ width: 80, height: 80, objectFit: "cover" }} />
//               ))}
//             </div>

//             <button type="submit" style={{ marginTop: 24, padding: "10px 16px" }}>
//               Save Product
//             </button>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }











