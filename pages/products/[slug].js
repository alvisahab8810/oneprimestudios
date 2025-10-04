// // pages/products/[id].js
// import { useRouter } from "next/router";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import styles from "@/styles/ProductDetails.module.css";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";

// export default function ProductDetails() {
//   const router = useRouter();
//   const { id } = router.query;
//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // images
//   const [activeImage, setActiveImage] = useState("");
//   const [lightboxOpen, setLightboxOpen] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState(0);

//   // B2B form state
//   const [qty, setQty] = useState("");
//   const [selectedColor, setSelectedColor] = useState("");
//   const [selectedFinish, setSelectedFinish] = useState("");
//   const [files, setFiles] = useState([]);
//   const [uploadedFiles, setUploadedFiles] = useState([]);
//    const [selectedAttrs, setSelectedAttrs] = useState({});

//   const handleAttrChange = (name, value) => {
//     setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
//   };

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     axios
//       .get(`/api/products/${id}`)
//       .then((res) => {
//         setProduct(res.data);
//         setActiveImage(res.data.mainImage || res.data.gallery?.[0] || "");
//       })
//       .catch((err) => console.error(err))
//       .finally(() => setLoading(false));
//   }, [id]);

//   const handleFiles = (e) => setFiles(Array.from(e.target.files));

//   const uploadFiles = async () => {
//     if (!files.length) return toast.error("Select files to upload");
//     const fd = new FormData();
//     files.forEach((f) => fd.append("files", f));
//     try {
//       const res = await axios.post("/api/upload", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setUploadedFiles(res.data.files);
//       toast.success("Files uploaded");
//     } catch {
//       toast.error("Upload failed");
//     }
//   };

//   const placeOrder = async () => {
//     if (!product) return;
//     try {
//       const orderPayload = {
//         product: product._id,
//         quantity: qty || product.minOrderQty || 1,
//         selectedOptions: { color: selectedColor, finish: selectedFinish },
//         files: uploadedFiles,
//         cost: product.salePrice || product.regularPrice,
//         amountPayable: product.salePrice || product.regularPrice,
//       };
//       await axios.post("/api/orders", orderPayload, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Order placed");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Order failed");
//     }
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!product) return <p>Product not found</p>;

//   const allImages = [product.mainImage, ...(product.gallery || [])].filter(
//     Boolean
//   );

//   return (
//     <>
//       <Head>
//         <title>One Prime Studios || Product Details</title>
//         <meta name="description" content="" />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//         <link rel="icon" href="/assets/images/logo.png" />
//       </Head>

//       <div className="container">
//         <Topbar />
//         <div
//           className={`product-page ${
//             product.b2bOptions?.enabled ? "b2b" : "b2c"
//           } ${styles.page}`}
//         >
//           {/* Left column */}
//           <div className={styles.left}>
//             <div
//               className={styles.mainImage}
//               onClick={() => {
//                 setLightboxOpen(true);
//                 setLightboxIndex(allImages.indexOf(activeImage));
//               }}
//             >
//               <img src={activeImage} alt={product.name} />

//               <div className={styles.gallery} products-gallery>
//                 {allImages.map((img, i) => (
//                   <img
//                     key={i}
//                     src={img}
//                     alt={`gallery-${i}`}
//                     onClick={() => setActiveImage(img)}
//                     className={activeImage === img ? styles.activeThumb : ""}
//                   />
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Right column */}
//           <aside className={styles.sidebar}>
//             <h1 className={styles.title}>{product.name}</h1>
//             {/* <h3>Price</h3> */}
//             <div className={styles.price}>
//               ₹{product.salePrice || product.regularPrice}
//               {product.salePrice && (
//                 <span className={styles.oldPrice}>₹{product.regularPrice}</span>
//               )}
//             </div>
//             <p className="product-min-order">
//               Minimum Order: {product.minOrderQty}
//             </p>

//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <h4>Order Options (B2B)</h4>

//                 <label>
//                   Quantity
//                   <select value={qty} onChange={(e) => setQty(e.target.value)}>
//                     <option value="">Select</option>
//                     {product.b2bOptions.quantityOptions?.map((q) => (
//                       <option key={q} value={q}>
//                         {q}
//                       </option>
//                     ))}
//                   </select>
//                 </label>

//                 {/* 🔑 Render Attributes */}
//                 <div style={{ marginTop: 24 }}>
//                   <h3>Options</h3>
//                   {product.attributes && product.attributes.length > 0 ? (
//                     product.attributes.map((attr, i) => (
//                       <div key={i} style={{ marginBottom: 16 }}>
//                         <label>
//                           <strong>{attr.name}</strong>{" "}
//                           {attr.required && (
//                             <span style={{ color: "red" }}>*</span>
//                           )}
//                         </label>
//                         <div style={{ marginTop: 8 }}>
//                           {attr.type === "text" && (
//                             <input
//                               type="text"
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             />
//                           )}
//                           {attr.type === "number" && (
//                             <input
//                               type="number"
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             />
//                           )}
//                           {attr.type === "select" && (
//                             <select
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             >
//                               <option value="">Select {attr.name}</option>
//                               {attr.values.map((val, idx) => (
//                                 <option key={idx} value={val}>
//                                   {val}
//                                 </option>
//                               ))}
//                             </select>
//                           )}
//                           {attr.type === "checkbox" && (
//                             <div>
//                               {attr.values.map((val, idx) => (
//                                 <label key={idx} style={{ marginRight: 12 }}>
//                                   <input
//                                     type="checkbox"
//                                     value={val}
//                                     onChange={(e) => {
//                                       const checked = e.target.checked;
//                                       setSelectedAttrs((prev) => {
//                                         const current = prev[attr.name] || [];
//                                         return {
//                                           ...prev,
//                                           [attr.name]: checked
//                                             ? [...current, val]
//                                             : current.filter((v) => v !== val),
//                                         };
//                                       });
//                                     }}
//                                   />{" "}
//                                   {val}
//                                 </label>
//                               ))}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p>No extra options</p>
//                   )}
//                 </div>

//                 {product.b2bOptions.allowFileUpload && (
//                   <div className={styles.fileUpload}>
//                     <label>Upload Design Files</label>
//                     <input type="file" multiple onChange={handleFiles} />
//                     <button onClick={uploadFiles} type="button">
//                       Upload
//                     </button>
//                     <div>
//                       {uploadedFiles.map((uf, i) => (
//                         <div key={i}>
//                           <a href={uf} target="_blank" rel="noreferrer">
//                             {uf}
//                           </a>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 <button className={styles.primaryBtn} onClick={placeOrder}>
//                   Place Order
//                 </button>
//               </div>
//             ) : (
//               <div className={styles.b2cActions}>
//                 <div className="d-flex">
//                   <button className={styles.secondaryBtn}>
//                     <img
//                       src="/assets/images/icons/upload.svg"
//                       alt="upload icon"
//                     ></img>{" "}
//                     Upload Your Design
//                   </button>
//                   {product.b2cOptions?.whatsappSupport && (
//                     <button className={styles.whatsappBtn}>
//                       <img
//                         src="/assets/images/icons/whatsapp.svg"
//                         alt="whatsaapp icon"
//                       ></img>{" "}
//                       Chat on WhatsApp
//                     </button>
//                   )}
//                 </div>

//                 <h4 className="product-description">Product Description</h4>
//                 <div
//                   className={styles.description}
//                   dangerouslySetInnerHTML={{
//                     __html: product.description || product.shortDescription,
//                   }}
//                 />
//               </div>
//             )}
//           </aside>

//         </div>

//         <div className="accordion my-4" id="productInfoAccordion">
//           {/* Our Specialization (open by default) */}
//           {product.ourSpecialization && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingOne">
//                 <button
//                   className="accordion-button"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseOne"
//                   aria-expanded="true"
//                   aria-controls="collapseOne"
//                 >
//                   Our Specialization
//                 </button>
//               </h2>
//               <div
//                 id="collapseOne"
//                 className="accordion-collapse collapse show"
//                 aria-labelledby="headingOne"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{
//                     __html: product.ourSpecialization,
//                   }}
//                 />
//               </div>
//             </div>
//           )}

//           {/* Important Notes (collapsed by default) */}
//           {product.importantNotes && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingTwo">
//                 <button
//                   className="accordion-button collapsed"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseTwo"
//                   aria-expanded="false"
//                   aria-controls="collapseTwo"
//                 >
//                   Important Notes
//                 </button>
//               </h2>
//               <div
//                 id="collapseTwo"
//                 className="accordion-collapse collapse"
//                 aria-labelledby="headingTwo"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.importantNotes }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

// // pages/products/[id].js
// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import styles from "@/styles/ProductDetails.module.css";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";

// export default function ProductDetails() {
//   const router = useRouter();
//   const { id } = router.query;
//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // images
//   const [activeImage, setActiveImage] = useState("");
//   const [lightboxOpen, setLightboxOpen] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState(0);

//   // B2B form state
//   const [qty, setQty] = useState(1);
//   const [files, setFiles] = useState([]);
//   const [uploadedFiles, setUploadedFiles] = useState([]);
//   const [selectedAttrs, setSelectedAttrs] = useState({});

//   const handleAttrChange = (name, value) => {
//     setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
//   };

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     axios
//       .get(`/api/products/${id}`)
//       .then((res) => {
//         setProduct(res.data);
//         setActiveImage(res.data.mainImage || res.data.gallery?.[0] || "");
//         setQty(res.data.minOrderQty || 1);
//       })
//       .catch((err) => console.error(err))
//       .finally(() => setLoading(false));
//   }, [id]);

//   const handleFiles = (e) => setFiles(Array.from(e.target.files));

//   const uploadFiles = async () => {
//     if (!files.length) return toast.error("Select files to upload");
//     const fd = new FormData();
//     files.forEach((f) => fd.append("files", f));
//     try {
//       const res = await axios.post("/api/upload", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setUploadedFiles(res.data.files);
//       toast.success("Files uploaded");
//     } catch {
//       toast.error("Upload failed");
//     }
//   };

//   // 🔑 Dynamic price calculation
//   const finalPrice = useMemo(() => {
//     if (!product) return 0;
//     let price = product.basePrice || 0;

//     // attribute modifiers
//     product.attributes?.forEach((attr) => {
//       const selected = selectedAttrs[attr.name];
//       if (!selected) return;

//       if (attr.type === "select") {
//         const opt = attr.values.find((v) => v.label === selected);
//         if (opt) price += opt.priceModifier || 0;
//       }

//       if (attr.type === "checkbox") {
//         selected.forEach((val) => {
//           const opt = attr.values.find((v) => v.label === val);
//           if (opt) price += opt.priceModifier || 0;
//         });
//       }
//     });

//     // pricing tiers
//     const applicableTier = [...(product.pricingTiers || [])]
//       .sort((a, b) => b.minQty - a.minQty) // highest first
//       .find((t) => qty >= t.minQty);

//     if (applicableTier) {
//       return applicableTier.price * qty;
//     }

//     return price * qty;
//   }, [product, selectedAttrs, qty]);

//   const placeOrder = async () => {
//     if (!product) return;
//     try {
//       const orderPayload = {
//         product: product._id,
//         quantity: qty,
//         selectedOptions: selectedAttrs,
//         files: uploadedFiles,
//         cost: finalPrice,
//         amountPayable: finalPrice,
//       };
//       await axios.post("/api/orders", orderPayload, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Order placed");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Order failed");
//     }
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!product) return <p>Product not found</p>;

//   const allImages = [product.mainImage, ...(product.gallery || [])].filter(
//     Boolean
//   );

//   return (
//     <>
//       <Head>
//         <title>{product.name} || Product Details</title>
//         <meta name="description" content={product.shortDescription || ""} />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//       </Head>

//       <div className="container">
//         <Topbar />
//         <div
//           className={`product-page ${
//             product.b2bOptions?.enabled ? "b2b" : "b2c"
//           } ${styles.page}`}
//         >
//           {/* Left column */}
//           <div className={styles.left}>
//             <div
//               className={styles.mainImage}
//               onClick={() => {
//                 setLightboxOpen(true);
//                 setLightboxIndex(allImages.indexOf(activeImage));
//               }}
//             >
//               <img src={activeImage} alt={product.name} />

//               <div className={styles.gallery} products-gallery>
//                 {allImages.map((img, i) => (
//                   <img
//                     key={i}
//                     src={img}
//                     alt={`gallery-${i}`}
//                     onClick={() => setActiveImage(img)}
//                     className={activeImage === img ? styles.activeThumb : ""}
//                   />
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Right column */}
//           <aside className={styles.sidebar}>
//             <h1 className={styles.title}>{product.name}</h1>

//             {/* Dynamic Price */}
//             <div className={styles.price}>
//               ₹{finalPrice.toFixed(2)}
//             </div>
//             <p className="product-min-order">
//               Minimum Order: {product.minOrderQty}
//             </p>

//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <h4>Order Options (B2B)</h4>

//                 {/* Quantity */}
//                 <label>
//                   Quantity
//                   <select
//                     value={qty}
//                     onChange={(e) => setQty(Number(e.target.value))}
//                   >
//                     <option value="">Select</option>
//                     {product.b2bOptions.quantityOptions?.map((q) => (
//                       <option key={q} value={q}>
//                         {q}
//                       </option>
//                     ))}
//                   </select>
//                 </label>

//                 {/* Attributes */}
//                 <div style={{ marginTop: 24 }}>
//                   <h3>Options</h3>
//                   {product.attributes?.length ? (
//                     product.attributes.map((attr, i) => (
//                       <div key={i} style={{ marginBottom: 16 }}>
//                         <label>
//                           <strong>{attr.name}</strong>{" "}
//                           {attr.required && (
//                             <span style={{ color: "red" }}>*</span>
//                           )}
//                         </label>
//                         <div style={{ marginTop: 8 }}>
//                           {attr.type === "text" && (
//                             <input
//                               type="text"
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             />
//                           )}
//                           {attr.type === "number" && (
//                             <input
//                               type="number"
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             />
//                           )}
//                           {attr.type === "select" && (
//                             <select
//                               onChange={(e) =>
//                                 handleAttrChange(attr.name, e.target.value)
//                               }
//                             >
//                               <option value="">Select {attr.name}</option>
//                               {attr.values.map((val, idx) => (
//                                 <option key={idx} value={val.label}>
//                                   {val.label}{" "}
//                                   {val.priceModifier
//                                     ? `(+₹${val.priceModifier})`
//                                     : ""}
//                                 </option>
//                               ))}
//                             </select>
//                           )}
//                           {attr.type === "checkbox" && (
//                             <div>
//                               {attr.values.map((val, idx) => (
//                                 <label key={idx} style={{ marginRight: 12 }}>
//                                   <input
//                                     type="checkbox"
//                                     value={val.label}
//                                     onChange={(e) => {
//                                       const checked = e.target.checked;
//                                       setSelectedAttrs((prev) => {
//                                         const current = prev[attr.name] || [];
//                                         return {
//                                           ...prev,
//                                           [attr.name]: checked
//                                             ? [...current, val.label]
//                                             : current.filter(
//                                                 (v) => v !== val.label
//                                               ),
//                                         };
//                                       });
//                                     }}
//                                   />{" "}
//                                   {val.label}{" "}
//                                   {val.priceModifier
//                                     ? `(+₹${val.priceModifier})`
//                                     : ""}
//                                 </label>
//                               ))}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p>No extra options</p>
//                   )}
//                 </div>

//                 {/* File upload */}
//                 {product.b2bOptions.allowFileUpload && (
//                   <div className={styles.fileUpload}>
//                     <label>Upload Design Files</label>
//                     <input type="file" multiple onChange={handleFiles} />
//                     <button onClick={uploadFiles} type="button">
//                       Upload
//                     </button>
//                     <div>
//                       {uploadedFiles.map((uf, i) => (
//                         <div key={i}>
//                           <a href={uf} target="_blank" rel="noreferrer">
//                             {uf}
//                           </a>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 <button className={styles.primaryBtn} onClick={placeOrder}>
//                   Place Order
//                 </button>
//               </div>
//             ) : (
//               <div className={styles.b2cActions}>
//                 <div className="d-flex">
//                   {product.b2cOptions?.designUpload && (
//                     <button className={styles.secondaryBtn}>
//                       <img
//                         src="/assets/images/icons/upload.svg"
//                         alt="upload icon"
//                       />{" "}
//                       Upload Your Design
//                     </button>
//                   )}
//                   {product.b2cOptions?.whatsappSupport && (
//                     <button className={styles.whatsappBtn}>
//                       <img
//                         src="/assets/images/icons/whatsapp.svg"
//                         alt="whatsaapp icon"
//                       />{" "}
//                       Chat on WhatsApp
//                     </button>
//                   )}
//                 </div>

//                 <h4 className="product-description">Product Description</h4>
//                 <div
//                   className={styles.description}
//                   dangerouslySetInnerHTML={{
//                     __html: product.description || product.shortDescription,
//                   }}
//                 />
//               </div>
//             )}
//           </aside>
//         </div>

//         <div className="accordion my-4" id="productInfoAccordion">
//           {/* Our Specialization */}
//           {product.ourSpecialization && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingOne">
//                 <button
//                   className="accordion-button"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseOne"
//                   aria-expanded="true"
//                   aria-controls="collapseOne"
//                 >
//                   Our Specialization
//                 </button>
//               </h2>
//               <div
//                 id="collapseOne"
//                 className="accordion-collapse collapse show"
//                 aria-labelledby="headingOne"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{
//                     __html: product.ourSpecialization,
//                   }}
//                 />
//               </div>
//             </div>
//           )}

//           {/* Important Notes */}
//           {product.importantNotes && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingTwo">
//                 <button
//                   className="accordion-button collapsed"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseTwo"
//                   aria-expanded="false"
//                   aria-controls="collapseTwo"
//                 >
//                   Important Notes
//                 </button>
//               </h2>
//               <div
//                 id="collapseTwo"
//                 className="accordion-collapse collapse"
//                 aria-labelledby="headingTwo"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.importantNotes }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import styles from "@/styles/ProductDetails.module.css";

// export default function ProductDetails() {
//   const router = useRouter();
//   const { id } = router.query;

//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Image gallery
//   const [activeImage, setActiveImage] = useState("");
//   const [lightboxOpen, setLightboxOpen] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState(0);

//   // B2B form state
//   const [qty, setQty] = useState(1);
//   const [files, setFiles] = useState([]);
//   const [uploadedFiles, setUploadedFiles] = useState([]);
//   const [selectedAttrs, setSelectedAttrs] = useState({});

//   const handleAttrChange = (name, value) => {
//     setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
//   };

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     axios
//       .get(`/api/products/${id}`)
//       .then((res) => {
//         const p = res.data;
//         setProduct(p);
//         setActiveImage(p.mainImage || p.gallery?.[0] || "");
//         setQty(p.minOrderQty || 1);
//       })
//       .catch((err) => {
//         console.error(err);
//         toast.error("Failed to fetch product");
//       })
//       .finally(() => setLoading(false));
//   }, [id]);

//   const handleFiles = (e) => setFiles(Array.from(e.target.files));

//   const uploadFiles = async () => {
//     if (!files.length) return toast.error("Select files to upload");
//     const fd = new FormData();
//     files.forEach((f) => fd.append("files", f));
//     try {
//       const res = await axios.post("/api/upload", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setUploadedFiles(res.data.files);
//       toast.success("Files uploaded successfully");
//     } catch {
//       toast.error("Upload failed");
//     }
//   };

//   // Dynamic price calculation based on quantity & attributes
//   const finalPrice = useMemo(() => {
//     if (!product) return 0;

//     let unitPrice = product.salePrice ?? product.basePrice ?? 0;

//     // Attribute modifiers
//     product.attributes?.forEach((attr) => {
//       const selected = selectedAttrs[attr.name];
//       if (!selected) return;

//       if (attr.type === "select") {
//         const opt = attr.values.find((v) => v.label === selected);
//         if (opt) unitPrice += opt.priceModifier || 0;
//       }

//       if (attr.type === "checkbox") {
//         selected.forEach((val) => {
//           const opt = attr.values.find((v) => v.label === val);
//           if (opt) unitPrice += opt.priceModifier || 0;
//         });
//       }
//     });

//     // Pricing tiers
//     const tier = [...(product.pricingTiers || [])]
//       .sort((a, b) => b.minQty - a.minQty)
//       .find((t) => qty >= t.minQty);

//     if (tier) unitPrice = tier.pricePerUnit ?? unitPrice;

//     return unitPrice * qty;
//   }, [product, selectedAttrs, qty]);

//   const placeOrder = async () => {
//     if (!product) return;
//     try {
//       const orderPayload = {
//         product: product._id,
//         quantity: qty,
//         selectedOptions: selectedAttrs,
//         files: uploadedFiles,
//         cost: finalPrice,
//         amountPayable: finalPrice,
//       };
//       await axios.post("/api/orders", orderPayload, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Order placed successfully");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Order failed");
//     }
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!product) return <p>Product not found</p>;

//   const allImages = [product.mainImage, ...(product.gallery || [])].filter(Boolean);

//   return (
//     <>
//       <Head>
//         <title>{product.name} || Product Details</title>
//         <meta name="description" content={product.shortDescription || ""} />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//       </Head>

//       <div className="container">
//         <Topbar />
//         <div className={`product-page ${product.b2bOptions?.enabled ? "b2b" : "b2c"} ${styles.page}`}>
//           {/* Left Column: Images */}
//           <div className={styles.left}>
//             <div className={styles.mainImage}>
//               <img src={activeImage} alt={product.name} />
//               <div className={styles.gallery}>
//                 {allImages.map((img, i) => (
//                   <img
//                     key={i}
//                     src={img}
//                     alt={`gallery-${i}`}
//                     onClick={() => setActiveImage(img)}
//                     className={activeImage === img ? styles.activeThumb : ""}
//                   />
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Right Column: Product Details */}
//           <aside className={styles.sidebar}>
//             <h1 className={styles.title}>{product.name}</h1>
//             <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
//             <p className="product-min-order">Minimum Order: {product.minOrderQty}</p>

//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <h4>Order Options (B2B)</h4>

//                 {/* Quantity */}
//                 {/* Quantity Input */}
// <label>
//   Quantity
//   <input
//     type="number"
//     value={qty}
//     min={product.minOrderQty || 1}
//     onChange={(e) => {
//       const val = Number(e.target.value);
//       setQty(val >= (product.minOrderQty || 1) ? val : product.minOrderQty);
//     }}
//     style={{ width: "100%", marginTop: "8px", padding: "6px" }}
//   />
// </label>

//                 {/* Attributes */}
//                 {product.attributes?.length ? (
//                   product.attributes.map((attr, i) => (
//                     <div key={i} style={{ marginBottom: 16 }}>
//                       <label>
//                         <strong>{attr.name}</strong>
//                         {attr.required && <span style={{ color: "red" }}> *</span>}
//                       </label>
//                       <div style={{ marginTop: 8 }}>
//                         {attr.type === "text" && (
//                           <input type="text" onChange={(e) => handleAttrChange(attr.name, e.target.value)} />
//                         )}
//                         {attr.type === "number" && (
//                           <input type="number" onChange={(e) => handleAttrChange(attr.name, e.target.value)} />
//                         )}
//                         {attr.type === "select" && (
//                           <select onChange={(e) => handleAttrChange(attr.name, e.target.value)}>
//                             <option value="">Select {attr.name}</option>
//                             {attr.values.map((val, idx) => (
//                               <option key={idx} value={val.label}>
//                                 {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
//                               </option>
//                             ))}
//                           </select>
//                         )}
//                         {attr.type === "checkbox" && (
//                           <div>
//                             {attr.values.map((val, idx) => (
//                               <label key={idx} style={{ marginRight: 12 }}>
//                                 <input
//                                   type="checkbox"
//                                   value={val.label}
//                                   onChange={(e) => {
//                                     const checked = e.target.checked;
//                                     setSelectedAttrs((prev) => {
//                                       const current = prev[attr.name] || [];
//                                       return {
//                                         ...prev,
//                                         [attr.name]: checked
//                                           ? [...current, val.label]
//                                           : current.filter((v) => v !== val.label),
//                                       };
//                                     });
//                                   }}
//                                 />
//                                 {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
//                               </label>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))
//                 ) : (
//                   <p>No extra options</p>
//                 )}

//                 {/* File upload */}
//                 {product.b2bOptions.allowFileUpload && (
//                   <div className={styles.fileUpload}>
//                     <label>Upload Design Files</label>
//                     <input type="file" multiple onChange={handleFiles} />
//                     <button onClick={uploadFiles} type="button">
//                       Upload
//                     </button>
//                     {uploadedFiles.map((uf, i) => (
//                       <div key={i}>
//                         <a href={uf} target="_blank" rel="noreferrer">
//                           {uf}
//                         </a>
//                       </div>
//                     ))}
//                   </div>
//                 )}

//                 <button className={styles.primaryBtn} onClick={placeOrder}>
//                   Place Order
//                 </button>
//               </div>
//             ) : (
//               <div className={styles.b2cActions}>
//                 <div className="d-flex">
//                   {product.b2cOptions?.designUpload && (
//                     <button className={styles.secondaryBtn}>
//                       <img src="/assets/images/icons/upload.svg" alt="upload icon" /> Upload Your Design
//                     </button>
//                   )}
//                   {product.b2cOptions?.whatsappSupport && (
//                     <button className={styles.whatsappBtn}>
//                       <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp icon" /> Chat on WhatsApp
//                     </button>
//                   )}
//                 </div>

//                 <h4 className="product-description">Product Description</h4>
//                 <div
//                   className={styles.description}
//                   dangerouslySetInnerHTML={{
//                     __html: product.description || product.shortDescription,
//                   }}
//                 />
//               </div>
//             )}
//           </aside>
//         </div>

//         {/* Accordion */}
//         <div className="accordion my-4" id="productInfoAccordion">
//           {product.ourSpecialization && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingOne">
//                 <button
//                   className="accordion-button"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseOne"
//                   aria-expanded="true"
//                   aria-controls="collapseOne"
//                 >
//                   Our Specialization
//                 </button>
//               </h2>
//               <div
//                 id="collapseOne"
//                 className="accordion-collapse collapse show"
//                 aria-labelledby="headingOne"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.ourSpecialization }}
//                 />
//               </div>
//             </div>
//           )}

//           {product.importantNotes && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingTwo">
//                 <button
//                   className="accordion-button collapsed"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseTwo"
//                   aria-expanded="false"
//                   aria-controls="collapseTwo"
//                 >
//                   Important Notes
//                 </button>
//               </h2>
//               <div
//                 id="collapseTwo"
//                 className="accordion-collapse collapse"
//                 aria-labelledby="headingTwo"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.importantNotes }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

// ================================================================= this is final ==============================================

// // pages/products/[id].js
// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import styles from "@/styles/ProductDetails.module.css";

// export default function ProductDetails() {
//   const router = useRouter();
//   const { id } = router.query;

//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Image gallery
//   const [activeImage, setActiveImage] = useState("");
//   const [lightboxOpen, setLightboxOpen] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState(0);

//   // B2B form state
//   const [qty, setQty] = useState(1);
//   const [files, setFiles] = useState([]);
//   const [uploadedFiles, setUploadedFiles] = useState([]);
//   const [selectedAttrs, setSelectedAttrs] = useState({});

//   const handleAttrChange = (name, value) => {
//     setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
//   };

//   useEffect(() => {
//     if (!id) return;

//     setLoading(true);
//     axios
//       .get(`/api/products/${id}`)
//       .then((res) => {
//         const p = res.data;
//         setProduct(p);
//         setActiveImage(p.mainImage || p.gallery?.[0] || "");
//         setQty(p.minOrderQty || 1);
//       })
//       .catch((err) => {
//         console.error(err);
//         toast.error("Failed to fetch product");
//       })
//       .finally(() => setLoading(false));
//   }, [id]);

//   const handleFiles = (e) => setFiles(Array.from(e.target.files));

//   const uploadFiles = async () => {
//     if (!files.length) return toast.error("Select files to upload");
//     const fd = new FormData();
//     files.forEach((f) => fd.append("files", f));
//     try {
//       const res = await axios.post("/api/upload", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setUploadedFiles(res.data.files);
//       toast.success("Files uploaded");
//     } catch {
//       toast.error("Upload failed");
//     }
//   };

//   // const usedQty = qty < (product.minOrderQty || 1) ? product.minOrderQty : qty;

// const finalPrice = useMemo(() => {
//   if (!product) return 0;

//   const effectiveQty = qty < (product.minOrderQty || 1) ? product.minOrderQty : qty;

//   let price = product.basePrice || 0;

//   // Attribute modifiers
//   product.attributes?.forEach((attr) => {
//     const selected = selectedAttrs[attr.name];
//     if (!selected) return;

//     if (attr.type === "select") {
//       const opt = attr.values.find((v) => v.label === selected);
//       if (opt) price += opt.priceModifier || 0;
//     }

//     if (attr.type === "checkbox") {
//       selected.forEach((val) => {
//         const opt = attr.values.find((v) => v.label === val);
//         if (opt) price += opt.priceModifier || 0;
//       });
//     }
//   });

//   // Apply pricing tiers
//   const tier = [...(product.pricingTiers || [])]
//     .sort((a, b) => b.minQty - a.minQty)
//     .find((t) => effectiveQty >= t.minQty);

//   if (tier) return tier.pricePerUnit * effectiveQty;

//   return price * effectiveQty;
// }, [product, selectedAttrs, qty]);

//   // 🔑 Dynamic price calculation
//   // const finalPrice = useMemo(() => {
//   //   if (!product) return 0;

//   //   let price = product.basePrice || 0;

//   //   // Apply attribute modifiers
//   //   product.attributes?.forEach((attr) => {
//   //     const selected = selectedAttrs[attr.name];
//   //     if (!selected) return;

//   //     if (attr.type === "select") {
//   //       const opt = attr.values.find((v) => v.label === selected);
//   //       if (opt) price += opt.priceModifier || 0;
//   //     }

//   //     if (attr.type === "checkbox") {
//   //       selected.forEach((val) => {
//   //         const opt = attr.values.find((v) => v.label === val);
//   //         if (opt) price += opt.priceModifier || 0;
//   //       });
//   //     }
//   //   });

//   //   // Apply pricing tiers
//   //   const tier = [...(product.pricingTiers || [])]
//   //     .sort((a, b) => b.minQty - a.minQty)
//   //     .find((t) => qty >= t.minQty);

//   //   if (tier) {
//   //     return tier.pricePerUnit * qty;
//   //   }

//   //   return price * qty;
//   // }, [product, selectedAttrs, qty]);

//   const placeOrder = async () => {
//     if (!product) return;
//     try {
//       const orderPayload = {
//         product: product._id,
//         quantity: qty,
//         selectedOptions: selectedAttrs,
//         files: uploadedFiles,
//         cost: finalPrice,
//         amountPayable: finalPrice,
//       };
//       await axios.post("/api/orders", orderPayload, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Order placed successfully");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Order failed");
//     }
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!product) return <p>Product not found</p>;

//   const allImages = [product.mainImage, ...(product.gallery || [])].filter(Boolean);

//   return (
//     <>
//       <Head>
//         <title>{product.name} || Product Details</title>
//         <meta name="description" content={product.shortDescription || ""} />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//       </Head>

//       <div className="container">
//         <Topbar />
//         <div className={`product-page ${product.b2bOptions?.enabled ? "b2b" : "b2c"} ${styles.page}`}>
//           {/* Left column: Images */}
//           <div className={styles.left}>
//             <div
//               className={styles.mainImage}
//               onClick={() => {
//                 setLightboxOpen(true);
//                 setLightboxIndex(allImages.indexOf(activeImage));
//               }}
//             >
//               <img src={activeImage} alt={product.name} />
//               <div className={styles.gallery}>
//                 {allImages.map((img, i) => (
//                   <img
//                     key={i}
//                     src={img}
//                     alt={`gallery-${i}`}
//                     onClick={() => setActiveImage(img)}
//                     className={activeImage === img ? styles.activeThumb : ""}
//                   />
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Right column: Details & B2B/B2C */}
//           <aside className={styles.sidebar}>
//             <h1 className={styles.title}>{product.name}</h1>

//             {/* Price */}
//             <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
//             <p className="product-min-order">Minimum Order: {product.minOrderQty}</p>

//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <h4>Order Options (B2B)</h4>

//                     <label>
//   Quantity
//   <input
//     type="number"
//     value={qty}
//     min={product.minOrderQty || 1} // HTML min
//     step={1}
//     onChange={(e) => setQty(Number(e.target.value))} // allow typing freely

//   />
// </label>

// {/*
//      <label>
//   Quantity
//   <input
//     type="number"
//     value={qty}
//     min={product?.minOrderQty || 1} // enforce minimum
//     step={1}
//     onChange={(e) => {
//       let val = Number(e.target.value);
//       if (val < (product?.minOrderQty || 1)) {
//         val = product?.minOrderQty || 1; // reset to minimum
//         toast.error(`Minimum order quantity is ${product?.minOrderQty}`);
//       }
//       setQty(val);
//     }}
//   />
// </label> */}
//                 {/* Attributes */}
//                 {product.attributes?.length ? (
//                   product.attributes.map((attr, i) => (
//                     <div key={i} style={{ marginBottom: 16 }}>
//                       <label>
//                         <strong>{attr.name}</strong>
//                         {attr.required && <span style={{ color: "red" }}> *</span>}
//                       </label>
//                       <div style={{ marginTop: 8 }}>
//                         {attr.type === "text" && (
//                           <input type="text" onChange={(e) => handleAttrChange(attr.name, e.target.value)} />
//                         )}
//                         {attr.type === "number" && (
//                           <input type="number" onChange={(e) => handleAttrChange(attr.name, e.target.value)} />
//                         )}
//                         {attr.type === "select" && (
//                           <select onChange={(e) => handleAttrChange(attr.name, e.target.value)}>
//                             <option value="">Select {attr.name}</option>
//                             {attr.values.map((val, idx) => (
//                               <option key={idx} value={val.label}>
//                                 {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
//                               </option>
//                             ))}
//                           </select>
//                         )}
//                         {attr.type === "checkbox" && (
//                           <div>
//                             {attr.values.map((val, idx) => (
//                               <label key={idx} style={{ marginRight: 12 }}>
//                                 <input
//                                   type="checkbox"
//                                   value={val.label}
//                                   onChange={(e) => {
//                                     const checked = e.target.checked;
//                                     setSelectedAttrs((prev) => {
//                                       const current = prev[attr.name] || [];
//                                       return {
//                                         ...prev,
//                                         [attr.name]: checked
//                                           ? [...current, val.label]
//                                           : current.filter((v) => v !== val.label),
//                                       };
//                                     });
//                                   }}
//                                 />{" "}
//                                 {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
//                               </label>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))
//                 ) : (
//                   <p>No extra options</p>
//                 )}

//                 {/* File upload */}
//                 {product.b2bOptions.allowFileUpload && (
//                   <div className={styles.fileUpload}>
//                     <label>Upload Design Files</label>
//                     <input type="file" multiple onChange={handleFiles} />
//                     <button type="button" onClick={uploadFiles}>
//                       Upload
//                     </button>
//                     {uploadedFiles.map((uf, i) => (
//                       <div key={i}>
//                         <a href={uf} target="_blank" rel="noreferrer">
//                           {uf}
//                         </a>
//                       </div>
//                     ))}
//                   </div>
//                 )}

//                 <button className={styles.primaryBtn} onClick={placeOrder}>
//                   Place Order
//                 </button>
//               </div>
//             ) : (
//               <div className={styles.b2cActions}>
//                 <div className="d-flex">
//                   {product.b2cOptions?.designUpload && (
//                     <button className={styles.secondaryBtn}>
//                       <img src="/assets/images/icons/upload.svg" alt="upload icon" /> Upload Your Design
//                     </button>
//                   )}
//                   {product.b2cOptions?.whatsappSupport && (
//                     <button className={styles.whatsappBtn}>
//                       <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp icon" /> Chat on WhatsApp
//                     </button>
//                   )}
//                 </div>

//                 <h4 className="product-description">Product Description</h4>
//                 <div
//                   className={styles.description}
//                   dangerouslySetInnerHTML={{
//                     __html: product.description || product.shortDescription,
//                   }}
//                 />
//               </div>
//             )}
//           </aside>
//         </div>

//         {/* Accordion for Specialization & Notes */}
//         <div className="accordion my-4" id="productInfoAccordion">
//           {product.ourSpecialization && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingOne">
//                 <button
//                   className="accordion-button"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseOne"
//                   aria-expanded="true"
//                   aria-controls="collapseOne"
//                 >
//                   Our Specialization
//                 </button>
//               </h2>
//               <div
//                 id="collapseOne"
//                 className="accordion-collapse collapse show"
//                 aria-labelledby="headingOne"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.ourSpecialization }}
//                 />
//               </div>
//             </div>
//           )}

//           {product.importantNotes && (
//             <div className="accordion-item">
//               <h2 className="accordion-header" id="headingTwo">
//                 <button
//                   className="accordion-button collapsed"
//                   type="button"
//                   data-bs-toggle="collapse"
//                   data-bs-target="#collapseTwo"
//                   aria-expanded="false"
//                   aria-controls="collapseTwo"
//                 >
//                   Important Notes
//                 </button>
//               </h2>
//               <div
//                 id="collapseTwo"
//                 className="accordion-collapse collapse"
//                 aria-labelledby="headingTwo"
//                 data-bs-parent="#productInfoAccordion"
//               >
//                 <div
//                   className="accordion-body"
//                   dangerouslySetInnerHTML={{ __html: product.importantNotes }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

// pages/products/[id].js
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Head from "next/head";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import styles from "@/styles/ProductDetails.module.css";
import ProductSlider from "@/components/home-page/ProductSlider";
import CustomAccordion from "@/components/products/Features";

export default function ProductDetails() {
  const router = useRouter();
  // const { id } = router.query;


const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Images
  const [activeImage, setActiveImage] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Order state
  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);




  useEffect(() => {
    if (!slug) return;

    setLoading(true);

    axios
      .get(`/api/products/slug/${slug}`, { withCredentials: true }) // ✅ send cookies
      .then((res) => {
        const p = res.data;
        setProduct(p);
        setActiveImage(p.mainImage || p.gallery?.[0] || "");
        setQty(p.minOrderQty || 1);
      })
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) {
          router.push("/login"); // redirect non-logged-in users
        } else {
          toast.error("Failed to fetch product");
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAttrChange = (name, value) => {
    setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e) => setFiles(Array.from(e.target.files));

  const uploadFiles = async () => {
    if (!files.length) return toast.error("Select files to upload");
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      const res = await axios.post("/api/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedFiles(res.data.files);
      toast.success("Files uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  // 🔑 Calculate price dynamically
  const finalPrice = useMemo(() => {
    if (!product) return 0;
    const effectiveQty =
      qty < (product.minOrderQty || 1) ? product.minOrderQty : qty;

    let price = product.basePrice || 0;

    // Attribute modifiers
    product.attributes?.forEach((attr) => {
      const selected = selectedAttrs[attr.name];
      if (!selected) return;

      if (attr.type === "select") {
        const opt = attr.values.find((v) => v.label === selected);
        if (opt) price += opt.priceModifier || 0;
      }

      if (attr.type === "checkbox") {
        selected.forEach((val) => {
          const opt = attr.values.find((v) => v.label === val);
          if (opt) price += opt.priceModifier || 0;
        });
      }
    });

    // Apply pricing tiers
    const tier = [...(product.pricingTiers || [])]
      .sort((a, b) => b.minQty - a.minQty)
      .find((t) => effectiveQty >= t.minQty);

    if (tier) return tier.pricePerUnit * effectiveQty;

    return price * effectiveQty;
  }, [product, selectedAttrs, qty]);

  const placeOrder = async () => {
    if (!product) return;
    try {
      const orderPayload = {
        product: product._id,
        quantity: qty,
        selectedOptions: selectedAttrs,
        files: uploadedFiles,
        cost: finalPrice,
        amountPayable: finalPrice,
      };
      await axios.post("/api/orders", orderPayload, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Order placed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Order failed");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  const allImages = [product.mainImage, ...(product.gallery || [])].filter(
    Boolean
  );






  const handleWhatsapp = () => {
  if (!product) return; // ✅ check product exists

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000/";

  // safe access
  const imageUrl = product.mainImage ? `${baseUrl}${product.mainImage}` : "";

  const productUrl = window.location.href;

  // create a WhatsApp message with name, url, and image
  const msg = `*${product.name}*\n\nCheck this product: ${productUrl}\n${imageUrl ? imageUrl : ""}`;

  const url = `https://wa.me/${
    product.b2cOptions?.whatsappNumber || "919236090098"
  }?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
};




  return (
    <div className="product-details">
      {/* <Head>
        <title>{product.name} || Product Details</title>
        <meta name="description" content={product.shortDescription || ""} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head> */}


 <Head>
  {product && (
    <>
      <title>{product.name} || Product Details</title>
      <meta name="description" content={product.shortDescription || ""} />
      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={product.shortDescription || ""} />
      <meta
        property="og:image"
        content={
          product.mainImage
            ? `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000/"}${product.mainImage}`
            : ""
        }
      />
      <meta
        property="og:url"
        content={typeof window !== "undefined" ? window.location.href : ""}
      />
      <meta property="og:type" content="product" />
    </>
  )}
</Head>



      <div className="container">
        <Topbar />
        <div
          className={`product-page ${
            product.b2bOptions?.enabled ? "b2b" : "b2c"
          } ${styles.page}`}
        >
          {/* Left: Images */}
          <div className={styles.left}>
            <div
              className={styles.mainImage}
              onClick={() => {
                setLightboxOpen(true);
                setLightboxIndex(allImages.indexOf(activeImage));
              }}
            >
              <img src={activeImage} alt={product.name} />
              <div className={styles.gallery}>
                {allImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`gallery-${i}`}
                    onClick={() => setActiveImage(img)}
                    className={activeImage === img ? styles.activeThumb : ""}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <aside className={styles.sidebar}>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
            <p className="product-min-order">
              Minimum Order: {product.minOrderQty}
            </p>

            {/* B2B Section */}
            {product.b2bOptions?.enabled ? (
              <div className={styles.b2bForm}>
                <div className="mt-4 mb-4 d-flex align-items-center">
                  <button
                    className={styles.whatsappBtn}
                    onClick={handleWhatsapp}
                  >
                    <img
                      src="/assets/images/icons/whatsapp.svg"
                      alt="whatsapp icon"
                    />{" "}
                    Chat on WhatsApp
                  </button>

                  {product.b2bOptions.allowFileUpload && (
                    <div className={styles.fileUpload}>
                      {/* <label>Upload Design Files</label> */}

                      {/* Hidden native input */}
                      <input
                        type="file"
                        id="b2bFileUpload"
                        multiple
                        onChange={handleFiles}
                        style={{ display: "none" }}
                      />

                      {/* Styled label acting as button */}
                      <label
                        htmlFor="b2bFileUpload"
                        className={styles.secondaryBtn}
                      >
                        <img
                          src="/assets/images/icons/upload.svg"
                          alt="upload icon"
                        />{" "}
                        {selectedFiles?.length > 0
                          ? `${selectedFiles.length} file(s) selected`
                          : "Upload your Design "}
                      </label>

                      {/* Upload button */}
                      <button
                        type="button"
                        className="upload-btn"
                        onClick={uploadFiles}
                      >
                        Submit
                      </button>

                      {/* Display uploaded files */}
                      {/* {uploadedFiles.map((uf, i) => (
                      <div key={i}>
                        <a href={uf} target="_blank" rel="noreferrer">
                          {uf}
                        </a>
                      </div>
                    ))} */}
                    </div>
                  )}
                </div>
                {/* <h4>Order Options (B2B)</h4> */}
            <div className={styles.b2bOrderSection}>
  {/* Quantity */}
  <div className={styles.inputGroup}>
    <label className={styles.inputLabel}>Quantity</label>
    <input
      type="number"
      value={qty}
      min={product.minOrderQty || 1}
      step={1}
      onChange={(e) => setQty(Number(e.target.value))}
      className={styles.inputField}
            style={{ width: "100px" }}

    />
    <small className={styles.helperText}>
      Minimum order: {product.minOrderQty || 1}
    </small>
  </div>

  {/* Attributes */}
  {product.attributes?.length ? (
    product.attributes.map((attr, i) => (
      <div key={i} className={styles.inputGroup}>
        <label className={styles.inputLabel}>
          {attr.name} {attr.required && <span className={styles.required}>*</span>}
        </label>

        {attr.type === "text" && (
          <input
            type="text"
            placeholder={`Enter ${attr.name}`}
            onChange={(e) => handleAttrChange(attr.name, e.target.value)}
            className={styles.inputField}
          />
        )}

        {attr.type === "number" && (
          <input
            type="number"
            placeholder={`Enter ${attr.name}`}
            onChange={(e) => handleAttrChange(attr.name, e.target.value)}
            className={styles.inputField}
          />
        )}

        {attr.type === "select" && (
          <select
            onChange={(e) => handleAttrChange(attr.name, e.target.value)}
            className={styles.selectField}
          >
            <option value="">Select {attr.name}</option>
            {attr.values.map((val, idx) => (
              <option key={idx} value={val.label}>
                {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
              </option>
            ))}
          </select>
        )}

        {attr.type === "checkbox" && (
          <div className={styles.checkboxGroup}>
            {attr.values.map((val, idx) => (
              <label key={idx} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={val.label}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedAttrs((prev) => {
                      const current = prev[attr.name] || [];
                      return {
                        ...prev,
                        [attr.name]: checked
                          ? [...current, val.label]
                          : current.filter((v) => v !== val.label),
                      };
                    });
                  }}
                  className={styles.checkboxInput}
                />
                {val.label} {val.priceModifier ? `(+₹${val.priceModifier})` : ""}
              </label>
            ))}
          </div>
        )}
      </div>
    ))
  ) : (
    <p className={styles.noOptions}>No extra options available</p>
  )}
</div>


                <button className={styles.primaryBtn} onClick={placeOrder}>
                  <img
                    src="/assets/images/icons/shopping-cart.svg"
                    alt="cart icon"
                  />{" "}
                  Place Order
                </button>
              </div>
            ) : (
              // B2C Section
              <div className={styles.b2cActions}>
                <div className="d-flex  align-items-center">
                  {/* {product.b2cOptions?.designUpload && (
                    <div>
                      <input type="file" multiple onChange={handleFiles} />
                      <button className={styles.secondaryBtn} onClick={uploadFiles}>
                        <img
                          src="/assets/images/icons/upload.svg"
                          alt="upload icon"
                        />{" "}
                        Upload Your Design
                      </button>
                    </div>
                  )} */}


                  {product.b2cOptions?.whatsappSupport && (
                    <button
                      className={styles.whatsappBtn}
                      onClick={handleWhatsapp}
                    >
                      <img
                        src="/assets/images/icons/whatsapp.svg"
                        alt="whatsapp icon"
                      />{" "}
                      Chat on WhatsApp
                    </button>
                  )}

                  {product.b2cOptions?.designUpload && (
                    <div className={styles.fileUpload}>
                      {/* hide native input */}
                      <input
                        type="file"
                        id="fileUpload"
                        multiple
                        onChange={handleFiles}
                        style={{ display: "none" }}
                      />

                      {/* your existing button design but now works as file picker */}
                      <label
                        htmlFor="fileUpload"
                        className={styles.secondaryBtn}
                      >
                        <img
                          src="/assets/images/icons/upload.svg"
                          alt="upload icon"
                        />{" "}
                        {selectedFiles?.length > 0
                          ? `${selectedFiles.length} file(s) selected`
                          : "Upload Your Design"}
                      </label>

                      {/* keep your upload button */}
                    

                       <button
                        type="button"
                        className="upload-btn"
                        onClick={uploadFiles}
                      >
                        Submit
                      </button>
                    </div>
                  )}

                  
                </div>

                <h4 className="product-description">Product Description</h4>
                <div
                  className={styles.description}
                  dangerouslySetInnerHTML={{
                    __html: product.description || product.shortDescription,
                  }}
                />
              </div>
            )}
          </aside>
        </div>

        {/* Accordion */}
        {/* <div className="accordion my-4" id="productInfoAccordion">
          {product.ourSpecialization && (
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingOne">
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseOne"
                  aria-expanded="true"
                  aria-controls="collapseOne"
                >
                  Our Specialization
                </button>
              </h2>
              <div
                id="collapseOne"
                className="accordion-collapse collapse show"
                aria-labelledby="headingOne"
                data-bs-parent="#productInfoAccordion"
              >
                <div
                  className="accordion-body"
                  dangerouslySetInnerHTML={{
                    __html: product.ourSpecialization,
                  }}
                />
              </div>
            </div>
          )}

          {product.importantNotes && (
            <div className="accordion-item">
              <h2 className="accordion-header" id="headingTwo">
                <button
                  className="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#collapseTwo"
                  aria-expanded="false"
                  aria-controls="collapseTwo"
                >
                  Important Notes
                </button>
              </h2>
              <div
                id="collapseTwo"
                className="accordion-collapse collapse"
                aria-labelledby="headingTwo"
                data-bs-parent="#productInfoAccordion"
              >
                <div
                  className="accordion-body"
                  dangerouslySetInnerHTML={{ __html: product.importantNotes }}
                />
              </div>
            </div>
          )}
        </div> */}

 <div className="custom-accordion">
  {product?.ourSpecialization && (
    <div className="accordion-item">
      <button
        className="accordion-header"
        onClick={(e) => {
          const currentItem = e.currentTarget.parentElement;
          const allItems = e.currentTarget.closest(".custom-accordion").querySelectorAll(".accordion-item");

          allItems.forEach((item) => {
            if (item !== currentItem) {
              item.querySelector(".accordion-body").classList.remove("show");
              item.querySelector(".accordion-header").classList.remove("open");
            }
          });

          const body = e.currentTarget.nextElementSibling;
          body.classList.toggle("show");
          e.currentTarget.classList.toggle("open");
        }}
      >
        Our Specialization
        <i className="ri-arrow-down-s-line arrow"></i>
      </button>
      <div className="accordion-body show">
        <div dangerouslySetInnerHTML={{ __html: product.ourSpecialization }} />
      </div>
    </div>
  )}

  {product?.importantNotes && (
    <div className="accordion-item">
      <button
        className="accordion-header"
        onClick={(e) => {
          const currentItem = e.currentTarget.parentElement;
          const allItems = e.currentTarget.closest(".custom-accordion").querySelectorAll(".accordion-item");

          allItems.forEach((item) => {
            if (item !== currentItem) {
              item.querySelector(".accordion-body").classList.remove("show");
              item.querySelector(".accordion-header").classList.remove("open");
            }
          });

          const body = e.currentTarget.nextElementSibling;
          body.classList.toggle("show");
          e.currentTarget.classList.toggle("open");
        }}
      >
        Important Notes
        <i className="ri-arrow-down-s-line arrow"></i>
      </button>
      <div className="accordion-body">
        <div dangerouslySetInnerHTML={{ __html: product.importantNotes }} />
      </div>
    </div>
  )}

  <style jsx>{`
    .custom-accordion {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      margin: 20px 0;
      font-family: Arial, sans-serif;
    }

    .accordion-item + .accordion-item {
      border-top: 1px solid #ddd;
    }
    .accordion-header {
      width: 100%;
      padding: 15px 20px;
      background: transparent;
      border: none;
      outline: none;
      text-align: left;
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s;
          // border-bottom: 1px solid #ddd;
    }
    .accordion-header:hover {
      // background: #eaeaea;
    }
    .accordion-header.open .arrow {
      transform: rotate(180deg);
    }
    .accordion-body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 20px;
      background: #fff;
    }
    .accordion-body.show {
      max-height: 500px;
      padding: 15px 20px;
    }
    .arrow {
      transition: transform 0.3s ease;
    }
  `}</style>
</div>




        
      </div>

      <ProductSlider />

      <Footer />
    </div>
  );
}
