// // pages/products/[id].js
// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import styles from "@/styles/ProductDetails.module.css";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import CustomAccordion from "@/components/products/Features";
// // import { toast } from "sonner";

// export default function ProductDetails() {
//   const router = useRouter();
//   // const { id } = router.query;

//   const { slug } = router.query;

//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Images
//   const [activeImage, setActiveImage] = useState("");
//   const [lightboxOpen, setLightboxOpen] = useState(false);
//   const [lightboxIndex, setLightboxIndex] = useState(0);

//   // Order state
//   const [qty, setQty] = useState(1);
//   const [files, setFiles] = useState([]);
//   const [uploadedFiles, setUploadedFiles] = useState([]);
//   const [selectedAttrs, setSelectedAttrs] = useState({});
//   const [selectedFiles, setSelectedFiles] = useState([]);

//   useEffect(() => {
//     if (!slug) return;

//     setLoading(true);

//     axios
//       .get(`/api/products/slug/${slug}`, { withCredentials: true }) // ✅ send cookies
//       .then((res) => {
//         const p = res.data;
//         setProduct(p);
//         setActiveImage(p.mainImage || p.gallery?.[0] || "");
//         setQty(p.minOrderQty || 1);
//       })
//       .catch((err) => {
//         console.error(err);
//         if (err.response?.status === 401) {
//           router.push("/login"); // redirect non-logged-in users
//         } else {
//           toast.error("Failed to fetch product");
//         }
//       })
//       .finally(() => setLoading(false));
//   }, [slug]);

//   const handleAttrChange = (name, value) => {
//     setSelectedAttrs((prev) => ({ ...prev, [name]: value }));
//   };

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

//   // 🔑 Calculate price dynamically
//   const finalPrice = useMemo(() => {
//     if (!product) return 0;
//     const effectiveQty =
//       qty < (product.minOrderQty || 1) ? product.minOrderQty : qty;

//     let price = product.basePrice || 0;

//     // Attribute modifiers
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

//     // Apply pricing tiers
//     const tier = [...(product.pricingTiers || [])]
//       .sort((a, b) => b.minQty - a.minQty)
//       .find((t) => effectiveQty >= t.minQty);

//     if (tier) return tier.pricePerUnit * effectiveQty;

//     return price * effectiveQty;
//   }, [product, selectedAttrs, qty]);

//   const placeOrder = () => {
//     if (!product) {
//       alert("Something is wrong. Please try again."); // optional simple message
//       return;
//     }

//     try {
//       // Prepare WhatsApp message
//       const msg = `Hi, I want to place an order for ${product.name}. Quantity: ${qty}`;
//       const url = `https://wa.me/${
//         product.b2cOptions?.whatsappNumber || "8081815141"
//       }?text=${encodeURIComponent(msg)}`;

//       // Open WhatsApp in new tab
//       window.open(url, "_blank");
//     } catch (err) {
//       alert("Something went wrong. Please try again."); // fallback error
//     }
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!product) return <p>Product not found</p>;

//   const allImages = [product.mainImage, ...(product.gallery || [])].filter(
//     Boolean
//   );

//   const handleWhatsapp = () => {
//     if (!product) return; // ✅ check product exists

//     const baseUrl =
//       typeof window !== "undefined"
//         ? window.location.origin
//         : "http://localhost:3000/";

//     // safe access
//     const imageUrl = product.mainImage ? `${baseUrl}${product.mainImage}` : "";

//     const productUrl = window.location.href;

//     // create a WhatsApp message with name, url, and image
//     const msg = `*${product.name}*\n\nCheck this product: ${productUrl}\n${
//       imageUrl ? imageUrl : ""
//     }`;

//     const url = `https://wa.me/${
//       product.b2cOptions?.whatsappNumber || "8081815141"
//     }?text=${encodeURIComponent(msg)}`;

//     window.open(url, "_blank");
//   };

// const addToCart = async () => {
//   if (!product) return toast.error("Product not loaded");

//   const token = localStorage.getItem("token");
//   if (!token) return toast.error("Please login first");

//   try {
//     const res = await axios.post(
//       "/api/cart",
//       {
//         productId: product._id,
//         quantity: qty,
//         selectedAttrs,
//         uploadedFiles,
//         price: finalPrice,
//       },
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//     );

//     toast.success("Added to cart");
//     router.push("/cart"); // optional
//   } catch (err) {
//     console.error(err);
//     toast.error(err.response?.data?.message || "Failed to add to cart");
//   }
// };

//   return (
//     <div className="product-details">
//       {/* <Head>
//         <title>{product.name} || Product Details</title>
//         <meta name="description" content={product.shortDescription || ""} />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//       </Head> */}

//       <Head>
//         {product && (
//           <>
//             <title>{product.name} || Product Details</title>
//             <meta name="description" content={product.shortDescription || ""} />
//             <meta property="og:title" content={product.name} />
//             <meta
//               property="og:description"
//               content={product.shortDescription || ""}
//             />
//             <meta
//               property="og:image"
//               content={
//                 product.mainImage
//                   ? `${
//                       typeof window !== "undefined"
//                         ? window.location.origin
//                         : "http://localhost:3000/"
//                     }${product.mainImage}`
//                   : ""
//               }
//             />
//             <meta
//               property="og:url"
//               content={
//                 typeof window !== "undefined" ? window.location.href : ""
//               }
//             />
//             <meta property="og:type" content="product" />
//           </>
//         )}
//       </Head>

//       <div className="container">
//         <Topbar />
//         <div
//           className={`product-page ${
//             product.b2bOptions?.enabled ? "b2b" : "b2c"
//           } ${styles.page}`}
//         >
//           {/* Left: Images */}
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

//           {/* Right: Details */}
//           <aside className={styles.sidebar}>
//             <h1 className={styles.title}>{product.name}</h1>
//             <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
//             <p className="product-min-order">
//               Minimum Order: {product.minOrderQty}
//             </p>

//             {/* B2B Section */}
//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <div className="mt-4 mb-4 d-flex align-items-center">
//                   {/* <button
//                     className={styles.whatsappBtn}
//                     onClick={handleWhatsapp}
//                   >
//                     <img
//                       src="/assets/images/icons/whatsapp.svg"
//                       alt="whatsapp icon"
//                     />{" "}
//                     Chat on WhatsApp
//                   </button> */}

//                   {product.b2bOptions.allowFileUpload && (
//                     <div className={styles.fileUpload}>

//                       {/* Hidden native input */}
//                       <input
//                         type="file"
//                         id="b2bFileUpload"
//                         multiple
//                         onChange={handleFiles}
//                         style={{ display: "none" }}
//                       />

//                       {/* Styled label acting as button */}
//                       <label
//                         htmlFor="b2bFileUpload"
//                         className={styles.secondaryBtn}
//                       >
//                         <img
//                           src="/assets/images/icons/upload.svg"
//                           alt="upload icon"
//                         />{" "}
//                         {selectedFiles?.length > 0
//                           ? `${selectedFiles.length} file(s) selected`
//                           : "Upload your Design "}
//                       </label>

//                       {/* Upload button */}
//                       <button
//                         type="button"
//                         className="upload-btn"
//                         onClick={uploadFiles}
//                       >
//                         Submit
//                       </button>

//                     </div>
//                   )}
//                 </div>
//                 {/* <h4>Order Options (B2B)</h4> */}
//                 <div className={styles.b2bOrderSection}>
//                   {/* Quantity */}
//                   <div className={styles.inputGroup}>
//                     <label className={styles.inputLabel}>Quantity</label>
//                     <input
//                       type="number"
//                       value={qty}
//                       min={product.minOrderQty || 1}
//                       step={1}
//                       onChange={(e) => setQty(Number(e.target.value))}
//                       className={styles.inputField}
//                       style={{ width: "100px" }}
//                     />
//                     <small className={styles.helperText}>
//                       Minimum order: {product.minOrderQty || 1}
//                     </small>
//                   </div>

//                   {/* Attributes */}
//                   {product.attributes?.length ? (
//                     product.attributes.map((attr, i) => (
//                       <div key={i} className={styles.inputGroup}>
//                         <label className={styles.inputLabel}>
//                           {attr.name}{" "}
//                           {attr.required && (
//                             <span className={styles.required}>*</span>
//                           )}
//                         </label>

//                         {attr.type === "text" && (
//                           <input
//                             type="text"
//                             placeholder={`Enter ${attr.name}`}
//                             onChange={(e) =>
//                               handleAttrChange(attr.name, e.target.value)
//                             }
//                             className={styles.inputField}
//                           />
//                         )}

//                         {attr.type === "number" && (
//                           <input
//                             type="number"
//                             placeholder={`Enter ${attr.name}`}
//                             onChange={(e) =>
//                               handleAttrChange(attr.name, e.target.value)
//                             }
//                             className={styles.inputField}
//                           />
//                         )}

//                         {attr.type === "select" && (
//                           <select
//                             onChange={(e) =>
//                               handleAttrChange(attr.name, e.target.value)
//                             }
//                             className={styles.selectField}
//                           >
//                             <option value="">Select {attr.name}</option>
//                             {attr.values.map((val, idx) => (
//                               <option key={idx} value={val.label}>
//                                 {val.label}{" "}
//                                 {val.priceModifier
//                                   ? `(+₹${val.priceModifier})`
//                                   : ""}
//                               </option>
//                             ))}
//                           </select>
//                         )}

//                         {attr.type === "checkbox" && (
//                           <div className={styles.checkboxGroup}>
//                             {attr.values.map((val, idx) => (
//                               <label key={idx} className={styles.checkboxLabel}>
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
//                                           : current.filter(
//                                               (v) => v !== val.label
//                                             ),
//                                       };
//                                     });
//                                   }}
//                                   className={styles.checkboxInput}
//                                 />
//                                 {val.label}{" "}
//                                 {val.priceModifier
//                                   ? `(+₹${val.priceModifier})`
//                                   : ""}
//                               </label>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     ))
//                   ) : (
//                     <p className={styles.noOptions}>
//                       No extra options available
//                     </p>
//                   )}
//                 </div>

//                 <div className={styles.b2bOrderActions}>
//                     {/* WhatsApp */}
//                     {/* <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
//                       <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp icon" /> Chat on WhatsApp
//                     </button> */}

//                     {/* Add to Cart */}
//                     <button className={styles.primaryBtn} onClick={addToCart}>
//                       <img src="/assets/images/icons/shopping-cart.svg" alt="cart icon" /> Add to Cart
//                     </button>
//                   </div>

//               </div>
//             ) : (
//               // B2C Section
//               <div className={styles.b2cActions}>
//                 <div className="d-flex  align-items-center">

//                   {product.b2cOptions?.whatsappSupport && (
//                     <button
//                       className={styles.whatsappBtn}
//                       onClick={handleWhatsapp}
//                     >
//                       <img
//                         src="/assets/images/icons/whatsapp.svg"
//                         alt="whatsapp icon"
//                       />{" "}
//                       Chat on WhatsApp
//                     </button>
//                   )}

//                   {product.b2cOptions?.designUpload && (
//                     <div className={styles.fileUpload}>
//                       {/* hide native input */}
//                       <input
//                         type="file"
//                         id="fileUpload"
//                         multiple
//                         onChange={handleFiles}
//                         style={{ display: "none" }}
//                       />

//                       {/* your existing button design but now works as file picker */}
//                       <label
//                         htmlFor="fileUpload"
//                         className={styles.secondaryBtn}
//                       >
//                         <img
//                           src="/assets/images/icons/upload.svg"
//                           alt="upload icon"
//                         />{" "}
//                         {selectedFiles?.length > 0
//                           ? `${selectedFiles.length} file(s) selected`
//                           : "Upload Your Design"}
//                       </label>

//                       {/* keep your upload button */}

//                       <button
//                         type="button"
//                         className="upload-btn"
//                         onClick={uploadFiles}
//                       >
//                         Submit
//                       </button>
//                     </div>
//                   )}
//                 </div>

//                 {/* b2c add to cart button  */}

//                 <button className={styles.primaryBtn} onClick={addToCart}>
//                   <img src="/assets/images/icons/shopping-cart.svg" alt="cart icon" />{" "}
//                   Add to Cart
//                 </button>

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

//         <div className="custom-accordion">
//           {product?.ourSpecialization && (
//             <div className="accordion-item">
//               <button
//                 className="accordion-header"
//                 onClick={(e) => {
//                   const currentItem = e.currentTarget.parentElement;
//                   const allItems = e.currentTarget
//                     .closest(".custom-accordion")
//                     .querySelectorAll(".accordion-item");

//                   allItems.forEach((item) => {
//                     if (item !== currentItem) {
//                       item
//                         .querySelector(".accordion-body")
//                         .classList.remove("show");
//                       item
//                         .querySelector(".accordion-header")
//                         .classList.remove("open");
//                     }
//                   });

//                   const body = e.currentTarget.nextElementSibling;
//                   body.classList.toggle("show");
//                   e.currentTarget.classList.toggle("open");
//                 }}
//               >
//                 Our Specialization
//                 <i className="ri-arrow-down-s-line arrow"></i>
//               </button>
//               <div className="accordion-body show">
//                 <div
//                   dangerouslySetInnerHTML={{
//                     __html: product.ourSpecialization,
//                   }}
//                 />
//               </div>
//             </div>
//           )}

//           {product?.importantNotes && (
//             <div className="accordion-item">
//               <button
//                 className="accordion-header"
//                 onClick={(e) => {
//                   const currentItem = e.currentTarget.parentElement;
//                   const allItems = e.currentTarget
//                     .closest(".custom-accordion")
//                     .querySelectorAll(".accordion-item");

//                   allItems.forEach((item) => {
//                     if (item !== currentItem) {
//                       item
//                         .querySelector(".accordion-body")
//                         .classList.remove("show");
//                       item
//                         .querySelector(".accordion-header")
//                         .classList.remove("open");
//                     }
//                   });

//                   const body = e.currentTarget.nextElementSibling;
//                   body.classList.toggle("show");
//                   e.currentTarget.classList.toggle("open");
//                 }}
//               >
//                 Important Notes
//                 <i className="ri-arrow-down-s-line arrow"></i>
//               </button>
//               <div className="accordion-body">
//                 <div
//                   dangerouslySetInnerHTML={{ __html: product.importantNotes }}
//                 />
//               </div>
//             </div>
//           )}

//           <style jsx>{`
//             .custom-accordion {
//               border: 1px solid #ddd;
//               border-radius: 8px;
//               overflow: hidden;
//               margin: 20px 0;
//               font-family: Arial, sans-serif;
//             }

//             .accordion-item + .accordion-item {
//               border-top: 1px solid #ddd;
//             }
//             .accordion-header {
//               width: 100%;
//               padding: 15px 20px;
//               background: transparent;
//               border: none;
//               outline: none;
//               text-align: left;
//               font-size: 1.1rem;
//               font-weight: 600;
//               display: flex;
//               justify-content: space-between;
//               align-items: center;
//               cursor: pointer;
//               transition: background 0.2s;
//               // border-bottom: 1px solid #ddd;
//             }
//             .accordion-header:hover {
//               // background: #eaeaea;
//             }
//             .accordion-header.open .arrow {
//               transform: rotate(180deg);
//             }
//             .accordion-body {
//               max-height: 0;
//               overflow: hidden;
//               transition: max-height 0.3s ease, padding 0.3s ease;
//               padding: 0 20px;
//               background: #fff;
//             }
//             .accordion-body.show {
//               max-height: 500px;
//               padding: 15px 20px;
//             }
//             .arrow {
//               transition: transform 0.3s ease;
//             }
//           `}</style>
//         </div>
//       </div>

//       <ProductSlider />

//       <Footer />
//     </div>
//   );
// }

// pages/products/[id].js
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
// import toast from "react-hot-toast";
// Use this:
import { toast } from "react-hot-toast";

import Head from "next/head";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import styles from "@/styles/ProductDetails.module.css";
import ProductSlider from "@/components/home-page/ProductSlider";
import CustomAccordion from "@/components/products/Features";
import Offcanvas from "@/components/header/Offcanvas";
import ProductFileUpload from "@/components/ProductFileUpload";
// import { toast } from "sonner";

export default function ProductDetails() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
    files.forEach((f) => fd.append("file", f)); // ✅ single field name = "file"
    fd.append("productId", product._id);

    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please login first");

      // 1️⃣ Upload to /api/upload/save-design (saves file physically + DB entry)
      const res = await axios.post("/api/upload/save-design", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Upload response:", res.data);

      // 2️⃣ Save uploaded URLs locally for add-to-cart
      const uploaded = (res.data.data || []).map((file) => ({
        url: file.fileUrl,
        name: file.fileName,
      }));

      setUploadedFiles(uploaded);
      toast.success("Design files uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  // const uploadFiles = async () => {
  //   if (!files.length) return toast.error("Select files to upload");

  //   const fd = new FormData();
  //   files.forEach((f) => fd.append("files", f));

  //   try {
  //     // 1️⃣ Upload the files to /api/upload (saves to /public/uploads/orders)
  //     const res = await axios.post("/api/upload", fd, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     });

  //     console.log("Upload response:", res.data);

  //     // Normalize uploaded file data
  //     const uploadedRaw = res.data.files || [];
  //     const uploaded = uploadedRaw.map((file) => ({
  //       url:
  //         file.url ||
  //         file.path ||
  //         `/uploads/orders/${file.filename}`, // fallback for local
  //       name: file.name || file.filename || file.originalname || "design-file",
  //     }));

  //     setUploadedFiles(uploaded);

  //     // 2️⃣ Save uploaded file info to MongoDB (DesignUpload collection)
  //     const token = localStorage.getItem("token");
  //     if (!token) return toast.error("Please login first");

  //     await axios.post(
  //       "/api/upload/save-design",
  //       {
  //         productId: product._id,
  //         files: uploaded, // ✅ now each file has { url, name }

  //       },
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     toast.success("Files uploaded & saved!");
  //   } catch (err) {
  //     console.error("Upload failed:", err);
  //     toast.error("Upload failed");
  //   }
  // };

  // const uploadFiles = async () => {
  //   if (!files.length) return toast.error("Select files to upload");
  //   const fd = new FormData();
  //   files.forEach((f) => fd.append("files", f));
  //   try {
  //     const res = await axios.post("/api/upload", fd, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     });
  //     setUploadedFiles(res.data.files);
  //     toast.success("Files uploaded");
  //   } catch {
  //     toast.error("Upload failed");
  //   }
  // };

  const finalPrice = useMemo(() => {
    if (!product) return 0;

    const minQty = product.minOrderQty || 1;
    const basePrice = Number(product.salePrice ?? product.basePrice ?? 0);
    const effectiveQty = qty < minQty ? minQty : qty;

    // 🧩 Calculate total modifier from selected attributes (per batch)
    let attrExtra = 0;
    (product.attributes || []).forEach((attr) => {
      const sel = selectedAttrs[attr.name];
      if (!sel) return;

      if (attr.type === "select") {
        const opt = (attr.values || []).find((v) => v.label === sel);
        if (opt) attrExtra += Number(opt.priceModifier || 0);
      }

      if (attr.type === "checkbox") {
        (Array.isArray(sel) ? sel : []).forEach((label) => {
          const opt = (attr.values || []).find((v) => v.label === label);
          if (opt) attrExtra += Number(opt.priceModifier || 0);
        });
      }

      if (attr.type === "number") {
        const numericVal = Number(sel || 0);
        if (!isNaN(numericVal)) attrExtra += numericVal;
      }
    });

    // 🧮 Price logic:
    // Base price applies per batch (minQty)
    // e.g. Visiting Card: ₹240 for 1000 pcs
    // If user selects 2000, it becomes 2 batches → 240 * (2000/1000)
    const batchMultiplier = effectiveQty / minQty;

    // total = (base price + attribute modifiers) × number of batches
    const total = (basePrice + attrExtra) * batchMultiplier;

    return total;
  }, [product, selectedAttrs, qty]);

  const placeOrder = () => {
    if (!product) {
      alert("Something is wrong. Please try again."); // optional simple message
      return;
    }

    try {
      // Prepare WhatsApp message
      const msg = `Hi, I want to place an order for ${product.name}. Quantity: ${qty}`;
      const url = `https://wa.me/${
        product.b2cOptions?.whatsappNumber || "8081815141"
      }?text=${encodeURIComponent(msg)}`;

      // Open WhatsApp in new tab
      window.open(url, "_blank");
    } catch (err) {
      alert("Something went wrong. Please try again."); // fallback error
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  const allImages = [product.mainImage, ...(product.gallery || [])].filter(
    Boolean
  );

 const handleWhatsapp = () => {
  const message = "Hi, I want to know more about this product."; 
  
  const url = `https://wa.me/${
    product?.b2cOptions?.whatsappNumber || "918081815141"
  }?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
};


  const addToCart = async () => {
    if (!product) return toast.error("Product not loaded");

    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please login first");

    try {
      const res = await axios.post(
        "/api/cart",
        {
          productId: product._id,
          quantity: qty,
          selectedAttrs,
          uploadedFiles: uploadedFiles.map((f) => f.url), // ✅ clean URLs only
          price: finalPrice,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Added to cart");
      router.push("/cart");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add to cart");
    }
  };

  // const addToCart = async () => {
  //   if (!product) return toast.error("Product not loaded");

  //   const token = localStorage.getItem("token");
  //   if (!token) return toast.error("Please login first");

  //   try {
  //     const res = await axios.post(
  //       "/api/cart",
  //       {
  //         productId: product._id,
  //         quantity: qty,
  //         selectedAttrs,
  //         // uploadedFiles,
  //          uploadedFiles: uploadedFiles.map((f) => f.url), // ✅ only send the URLs
  //         price: finalPrice,
  //       },
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     toast.success("Added to cart");
  //     router.push("/cart"); // optional
  //   } catch (err) {
  //     console.error(err);
  //     toast.error(err.response?.data?.message || "Failed to add to cart");
  //   }
  // };

  return (
    <div className="product-details">
      <Head>
        {product && (
          <>
            <title>{product.name} || Product Details</title>
            <meta name="description" content={product.shortDescription || ""} />
            <meta property="og:title" content={product.name} />
            <meta
              property="og:description"
              content={product.shortDescription || ""}
            />
            <meta
              property="og:image"
              content={
                product.mainImage
                  ? `${
                      typeof window !== "undefined"
                        ? window.location.origin
                        : "http://localhost:3000/"
                    }${product.mainImage}`
                  : ""
              }
            />
            <meta
              property="og:url"
              content={
                typeof window !== "undefined" ? window.location.href : ""
              }
            />
            <meta property="og:type" content="product" />
          </>
        )}
      </Head>
      <Topbar />
      <Offcanvas />
      <div className="container padding-top-40">
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
              <img
                src={activeImage}
                alt={product.name}
                className="pr-details-main-img"
              />
              <div className={styles.gallery} id="product-gallery">
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
          <aside className={styles.sidebar} id="side-bar">
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
            <p className="product-min-order">
              Minimum Order: {product.minOrderQty}
            </p>

            {/* B2B Section */}
            {product.b2bOptions?.enabled ? (
              <div className={styles.b2bForm}>
                <div className="mobile-none">
                  {/* <div className="mt-4 mb-4 d-flex align-items-center">
                    {product.b2bOptions.allowFileUpload && (
                      <div className={styles.fileUpload}>
                     
                        <input
                          type="file"
                          id="b2bFileUpload"
                          multiple
                          onChange={handleFiles}
                          style={{ display: "none" }}
                        />

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

                      
                        <button
                          type="button"
                          className="upload-btn"
                          onClick={uploadFiles}
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div> */}

                  <ProductFileUpload
                    product={product}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    setFiles={setFiles} // REQUIRED
                    uploadFiles={uploadFiles}
                  />
                </div>

                <div className={styles.b2bOrderSection} id="b2border-section">
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
                  {/* Product Attributes Section */}

                  {product.attributes?.length ? (
                    product.attributes.map((attr, i) => (
                      <div key={i} className={styles.inputGroup}>
                        <label className={styles.inputLabel}>
                          {attr.name}{" "}
                          {attr.required && (
                            <span className={styles.required}>*</span>
                          )}
                        </label>

                        {attr.type === "text" && (
                          <input
                            type="text"
                            placeholder={`Enter ${attr.name}`}
                            onChange={(e) =>
                              handleAttrChange(attr.name, e.target.value)
                            }
                            className={styles.inputField}
                          />
                        )}

                        {attr.type === "number" && (
                          <input
                            type="number"
                            placeholder={`Enter ${attr.name}`}
                            onChange={(e) =>
                              handleAttrChange(attr.name, e.target.value)
                            }
                            className={styles.inputField}
                          />
                        )}

                        {attr.type === "select" && (
                          <select
                            className={styles.selectField}
                            value={selectedAttrs[attr.name] ?? ""}
                            onChange={(e) =>
                              handleAttrChange(attr.name, e.target.value)
                            }
                          >
                            <option value="">Select {attr.name}</option>
                            {(attr.values || []).map((val, idx) => (
                              <option key={idx} value={val.label}>
                                {val.label}{" "}
                                {val.priceModifier
                                  ? `( +₹${val.priceModifier} )`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        )}

                        {attr.type === "checkbox" && (
                          <div className={styles.checkboxGroup}>
                            {(attr.values || []).map((val, idx) => (
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
                                          : current.filter(
                                              (v) => v !== val.label
                                            ),
                                      };
                                    });
                                  }}
                                  className={styles.checkboxInput}
                                />
                                {val.label}{" "}
                                {val.priceModifier
                                  ? `( +₹${val.priceModifier} )`
                                  : ""}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.noOptions}>
                      No extra options available
                    </p>
                  )}
                </div>

                <div className="mobile-none">
                  <div className={styles.b2bOrderActions}>
                    {!product.b2bOptions.allowFileUpload ||
                    uploadedFiles.length > 0 ? (
                      <button className={styles.primaryBtn} onClick={addToCart}>
                        <img
                          src="/assets/images/icons/shopping-cart.svg"
                          alt="cart icon"
                        />{" "}
                        Add to Cart
                      </button>
                    ) : (
                      <p className="text-muted mt-2">
                        Please upload your design before adding to cart.
                      </p>
                    )}

                    {/* <h3 className={styles.price}>₹{finalPrice.toFixed(2)}</h3> */}
                  </div>
                </div>
              </div>
            ) : (
              // B2C Section
              <div className="mobile-none">
                <div className={styles.b2cActions}>
                  <div className="d-flex  align-items-center">
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
                      <ProductFileUpload
                        product={product}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        setFiles={setFiles} // REQUIRED
                        uploadFiles={uploadFiles}
                      />

                      // <div className={styles.fileUpload}>
                      //   {/* hide native input */}
                      //   <input
                      //     type="file"
                      //     id="fileUpload"
                      //     multiple
                      //     onChange={handleFiles}
                      //     style={{ display: "none" }}
                      //   />

                      //   {/* your existing button design but now works as file picker */}
                      //   <label
                      //     htmlFor="fileUpload"
                      //     className={styles.secondaryBtn}
                      //   >
                      //     <img
                      //       src="/assets/images/icons/upload.svg"
                      //       alt="upload icon"
                      //     />{" "}
                      //     {selectedFiles?.length > 0
                      //       ? `${selectedFiles.length} file(s) selected`
                      //       : "Upload Your Design"}
                      //   </label>

                      //   {/* keep your upload button */}

                      //   <button
                      //     type="button"
                      //     className="upload-btn"
                      //     onClick={uploadFiles}
                      //   >
                      //     Submit
                      //   </button>
                      // </div>
                    )}
                  </div>

                  {/* b2c add to cart button  */}

                  {/* <button className={styles.primaryBtn} onClick={addToCart}>
                  <img
                    src="/assets/images/icons/shopping-cart.svg"
                    alt="cart icon"
                  />{" "}
                  Add to Cart
                  
                </button> */}

                  {!product.b2cOptions?.designUpload ||
                  uploadedFiles.length > 0 ? (
                    <button className={styles.primaryBtn} onClick={addToCart}>
                      <img
                        src="/assets/images/icons/shopping-cart.svg"
                        alt="cart icon"
                      />{" "}
                      Add to Cart
                    </button>
                  ) : (
                    <p className="text-muted mt-2">
                      Please upload your design before adding to cart.
                    </p>
                  )}

                  <h4 className="product-description">Product Description</h4>
                  <div
                    className={styles.description}
                    dangerouslySetInnerHTML={{
                      __html: product.description || product.shortDescription,
                    }}
                  />
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="custom-accordion">
          {product?.ourSpecialization && (
            <div className="accordion-item">
              <button
                className="accordion-header"
                onClick={(e) => {
                  const currentItem = e.currentTarget.parentElement;
                  const allItems = e.currentTarget
                    .closest(".custom-accordion")
                    .querySelectorAll(".accordion-item");

                  allItems.forEach((item) => {
                    if (item !== currentItem) {
                      item
                        .querySelector(".accordion-body")
                        .classList.remove("show");
                      item
                        .querySelector(".accordion-header")
                        .classList.remove("open");
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
                <div
                  dangerouslySetInnerHTML={{
                    __html: product.ourSpecialization,
                  }}
                />
              </div>
            </div>
          )}

          {product?.importantNotes && (
            <div className="accordion-item">
              <button
                className="accordion-header"
                onClick={(e) => {
                  const currentItem = e.currentTarget.parentElement;
                  const allItems = e.currentTarget
                    .closest(".custom-accordion")
                    .querySelectorAll(".accordion-item");

                  allItems.forEach((item) => {
                    if (item !== currentItem) {
                      item
                        .querySelector(".accordion-body")
                        .classList.remove("show");
                      item
                        .querySelector(".accordion-header")
                        .classList.remove("open");
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
                <div
                  dangerouslySetInnerHTML={{ __html: product.importantNotes }}
                />
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
      {/* for b2b users mobile version */}

      {/* MOBILE BOTTOM STICKY BAR */}
      <div className="ops-mobile-sticky">
        {/* BUTTON AREA  */}
        {!mobilePanelOpen && uploadedFiles.length === 0 && (
          <div className="desktop-none">
            <div className="mobile-whtasapp d-flex  align-items-center justify-between">
              {product.b2cOptions?.whatsappSupport && (
                <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
                  <img
                    src="/assets/images/icons/whatsapp.svg"
                    alt="whatsapp icon"
                  />{" "}
                  WhatsApp
                </button>
              )}

              <ProductFileUpload
                product={product}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                setFiles={setFiles} // REQUIRED
                uploadFiles={uploadFiles}
              />
            </div>
          </div>
        )}

        {!mobilePanelOpen && uploadedFiles.length > 0 && (
          <button className="ops-mobile-main-btn cart" onClick={addToCart}>
            <img src="/assets/images/icons/shopping-cart.svg" />
            Add to Cart
          </button>
        )}
      </div>

      <ProductSlider />

      <Footer />
    </div>
  );
}
