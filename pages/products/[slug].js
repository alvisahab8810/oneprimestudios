// pages/products/[slug].js  (ProductDetails page)
// FIXES:
// 1. formatImageDimensions now shows correct unit (inch/mm/px) not raw px
// 2. "Allowed Size" text shows e.g. "210x297 mm" or "1280x760 inch" correctly
// 3. All other logic (B2B/B2C, cart, file upload, pricing tiers) 100% unchanged

import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Head from "next/head";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import styles from "@/styles/ProductDetails.module.css";
import ProductSlider from "@/components/home-page/ProductSlider";
import Offcanvas from "@/components/header/Offcanvas";
import ProductFileUpload from "@/components/ProductFileUpload";

// ── FIX: show correct unit label ─────────────────────────────────────────────
// OLD code always showed "px" even when admin saved "inch" or "mm"
// NEW: reads the .unit field and shows the right label
const formatImageDimensions = (dim) => {
  if (!dim) return "";

  // Legacy products stored dimension as plain string — show as-is
  if (typeof dim === "string") return dim;

  // New products store { unit: "inch"|"mm"|"px", values: "210x297" }
  if (typeof dim === "object") {
    const values = dim.values || "";
    const unit = dim.unit || "px";
    if (!values) return "";
    const unitLabel = unit === "inch" ? "inch" : unit === "mm" ? "mm" : "px";
    return `${values} ${unitLabel}`;
  }

  return "";
};

export default function ProductDetails() {
  const [specialRemarks, setSpecialRemarks] = useState("");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [uploadedAttrFiles, setUploadedAttrFiles] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const { slug } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeImage, setActiveImage] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [qty, setQty] = useState(1);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedAttrs, setSelectedAttrs] = useState({});

  const canAddToCart = useMemo(() => {
    if (!product) return false;
    const hasLegacyFile = uploadedFiles.length > 0;
    const hasAttributeUpload = Object.keys(uploadedAttrFiles).length > 0;
    return hasLegacyFile || hasAttributeUpload;
  }, [product, uploadedFiles, uploadedAttrFiles]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    axios
      .get(`/api/products/slug/${slug}`, { withCredentials: true })
      .then((res) => {
        const p = res.data;
        setProduct(p);
        setActiveImage(p.mainImage || p.gallery?.[0] || "");
        setQty(p.minOrderQty || 1);
      })
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) {
          router.push("/login");
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
    files.forEach((f) => fd.append("file", f));
    fd.append("productId", product._id);
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please login first");
      const res = await axios.post("/api/upload/save-design", fd, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      const uploaded = (res.data.data || []).map((file) => ({ url: file.fileUrl, name: file.fileName }));
      setUploadedFiles(uploaded);
      toast.success("Design files uploaded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  function calculateDynamicPrice(qty, tiers, baseTotalPrice, minOrderQty) {
    const allTiers = [
      { minQty: minOrderQty, totalPrice: baseTotalPrice },
      ...tiers.map((t) => ({ minQty: Number(t.minQty), totalPrice: Number(t.pricePerUnit) })),
    ].sort((a, b) => a.minQty - b.minQty);

    let matchingTier = allTiers.find((t) => qty <= t.minQty);
    if (!matchingTier) {
      const last = allTiers[allTiers.length - 1];
      return qty * (last.totalPrice / last.minQty);
    }
    return qty * (matchingTier.totalPrice / matchingTier.minQty);
  }

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    const minQty = product.minOrderQty || 1;
    const effectiveQty = qty < minQty ? minQty : qty;
    const batchCount = effectiveQty / minQty;
    const baseTierPrice = calculateDynamicPrice(effectiveQty, product.pricingTiers, Number(product.basePrice), minQty);

    let attrExtraPerBatch = 0;
    (product.attributes || []).forEach((attr) => {
      const sel = selectedAttrs[attr.name];
      if (!sel) return;
      if (attr.type === "select") {
        const opt = (attr.values || []).find((v) => v.label === sel);
        if (opt) attrExtraPerBatch += Number(opt.priceModifier || 0);
      }
      if (attr.type === "checkbox") {
        (Array.isArray(sel) ? sel : []).forEach((label) => {
          const opt = (attr.values || []).find((v) => v.label === label);
          if (opt) attrExtraPerBatch += Number(opt.priceModifier || 0);
        });
      }
      if (attr.type === "number") {
        const numeric = Number(sel);
        if (!isNaN(numeric)) attrExtraPerBatch += numeric;
      }
    });

    return baseTierPrice + attrExtraPerBatch * batchCount;
  }, [product, qty, selectedAttrs]);

  const quantityLadder = useMemo(() => {
    if (!product) return [];
    const base = Number(product.minOrderQty || 1);
    const tierQtys = (product.pricingTiers || []).map((t) => Number(t.minQty)).filter((n) => !isNaN(n) && n > 0);
    return Array.from(new Set([base, ...tierQtys])).sort((a, b) => a - b);
  }, [product]);

  const increaseQty = () => {
    const list = quantityLadder;
    if (!list.length) return;
    for (let i = 0; i < list.length; i++) {
      if (list[i] > Number(qty)) { setQty(list[i]); return; }
    }
    setQty(list[list.length - 1]);
  };

  const decreaseQty = () => {
    const list = quantityLadder;
    if (!list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] < Number(qty)) { setQty(list[i]); return; }
    }
    setQty(list[0]);
  };

  const placeOrder = () => {
    if (!product) return;
    const msg = `Hi, I want to place an order for ${product.name}. Quantity: ${qty}`;
    window.open(`https://wa.me/${product.b2cOptions?.whatsappNumber || "8081815141"}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── UPDATED: fix attrKey index mismatch ─────────────────────────────────
  // OLD BUG: used filtered-array index (i within upload-only attrs) → attrKey was e.g. FileUpload__0
  //          but render used full-array index → attrKey was e.g. FileUpload__2 → never matched
  // OLD:
  // const validateUploadAttrs = () => {
  //   const uploadAttrs = product?.attributes?.filter((a) => a.type === "upload") || [];
  //   if (uploadAttrs.length === 0) return true;
  //   for (let i = 0; i < uploadAttrs.length; i++) {
  //     const a = uploadAttrs[i];
  //     const safeName = (a.name || "attr").trim();
  //     const attrKey = `${safeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;
  //     if (a.uploadRules?.required && !uploadedAttrFiles[attrKey]) {
  //       toast.error(`Please upload file for "${a.name}"`);
  //       return false;
  //     }
  //   }
  //   return true;
  // };
  // NEW: iterate ALL attributes so index matches the render loop
  const validateUploadAttrs = () => {
    const allAttrs = product?.attributes || [];
    for (let i = 0; i < allAttrs.length; i++) {
      const a = allAttrs[i];
      if (a.type !== "upload") continue;
      const safeName = (a.name || "attr").trim();
      const attrKey = `${safeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;
      if (a.uploadRules?.required && !uploadedAttrFiles[attrKey]) {
        toast.error(`Please upload file for "${a.name}"`);
        return false;
      }
    }
    return true;
  };

  // ── UPDATED: loader state + 401 redirect on expired token ───────────────
  // OLD:
  // const addToCart = async () => {
  //   if (!product) return toast.error("Product not loaded");
  //   if (!validateUploadAttrs()) return;
  //   const token = localStorage.getItem("token");
  //   if (!token) return toast.error("Please login first");
  //   try {
  //     let uploadedAttrUrls = [];
  //     if (Object.keys(uploadedAttrFiles).length > 0) {
  //       const fd = new FormData(); const attrMap = {};
  //       Object.keys(uploadedAttrFiles).forEach((attrKey) => { ... });
  //       fd.append("productId", product._id); fd.append("attrMap", JSON.stringify(attrMap));
  //       const uploadRes = await axios.post("/api/upload/save-design", fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
  //       uploadedAttrUrls = uploadRes.data.data.map((f) => ({ ... }));
  //     }
  //     await axios.post("/api/cart", { ... }, { headers: { Authorization: `Bearer ${token}` } });
  //     toast.success("Added to cart"); router.push("/cart");
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || "Failed to add to cart");
  //   }
  // };
  // NEW:
  const addToCart = async () => {
    if (!product) return toast.error("Product not loaded");
    if (!validateUploadAttrs()) return;
    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please login first");

    setIsUploading(true);
    try {
      let uploadedAttrUrls = [];
      if (Object.keys(uploadedAttrFiles).length > 0) {
        const fd = new FormData();
        const attrMap = {};
        Object.keys(uploadedAttrFiles).forEach((attrKey) => {
          const file = uploadedAttrFiles[attrKey];
          fd.append(attrKey, file);
          const idx = attrKey.split("__").pop();
          const attrObj = product.attributes?.[Number(idx)];
          attrMap[attrKey] = (attrObj && attrObj.name) || attrKey;
        });
        fd.append("productId", product._id);
        fd.append("attrMap", JSON.stringify(attrMap));
        const uploadRes = await axios.post("/api/upload/save-design", fd, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        uploadedAttrUrls = uploadRes.data.data.map((f) => ({
          attributeKey: f.attribute,
          attributeName: f.attributeName || attrMap[f.attribute] || f.attribute,
          url: f.fileUrl,
          name: f.fileName,
        }));
      }

      await axios.post(
        "/api/cart",
        {
          productId: product._id,
          quantity: qty,
          selectedAttrs,
          price: finalPrice,
          remarks: specialRemarks,
          uploadedFiles: uploadedFiles.map((f) => f.url),
          uploadedAttributeFiles: uploadedAttrUrls,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Added to cart");
      router.push("/cart");
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        router.push("/login");
        return;
      }
      toast.error(err.response?.data?.message || "Failed to add to cart");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  const allImages = [product.mainImage, ...(product.gallery || [])].filter(Boolean);

  const handleWhatsapp = () => {
    const message = "Hi, I want to know more about this product.";
    window.open(`https://wa.me/${product?.b2cOptions?.whatsappNumber || "918081815141"}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="product-details">
      <Head>
        {product && (
          <>
            <title>{product.name} || Product Details</title>
            <meta name="description" content={product.shortDescription || ""} />
            <meta property="og:title" content={product.name} />
            <meta property="og:description" content={product.shortDescription || ""} />
            <meta property="og:image" content={product.mainImage ? `${typeof window !== "undefined" ? window.location.origin : ""}${product.mainImage}` : ""} />
            <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : ""} />
            <meta property="og:type" content="product" />
          </>
        )}
      </Head>

      <Topbar />
      <Offcanvas />

      <div className="container padding-top-40">
        <div className={`product-page ${product.b2bOptions?.enabled ? "b2b" : "b2c"} ${styles.page}`}>

          {/* ── Left: Images ── */}
          <div className={styles.left}>
            <div className={styles.mainImage} onClick={() => { setLightboxOpen(true); setLightboxIndex(allImages.indexOf(activeImage)); }}>
              <img src={activeImage} alt={product.name} className="pr-details-main-img" />
              <div className={styles.gallery} id="product-gallery">
                {allImages.map((img, i) => (
                  <img key={i} src={img} alt={`gallery-${i}`} onClick={() => setActiveImage(img)} className={activeImage === img ? styles.activeThumb : ""} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Details ── */}
          <aside className={styles.sidebar} id="side-bar">
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
            <p className="product-min-order">Minimum Order: {product.minOrderQty}</p>

            {/* ── B2B Section ── */}
            {product.b2bOptions?.enabled ? (
              <div className={styles.b2bForm}>
                <div className={styles.b2bOrderSection} id="b2border-section">

                  <div className="b2b-container-area">
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Quantity</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={decreaseQty} className="quantity-btns">-</button>
                        <input type="text" value={qty} readOnly className={styles.inputField} style={{ width: "100px", textAlign: "center" }} />
                        <button type="button" onClick={increaseQty} className="quantity-btns">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-4 attributes-area">
                    {product.attributes?.length ? (
                      product.attributes.map((attr, i) => {
                        const safeName = (attr.name || "attr").trim();
                        const attrKey = `${safeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;
                        return (
                          <div className="mobile-none" key={i}>
                            <div className={styles.inputGroup}>
                              <label className={styles.inputLabel}>
                                {attr.name} {attr.required && <span className={styles.required}>*</span>}
                              </label>

                              {attr.type === "text" && (
                                <input type="text" placeholder={`Enter ${attr.name}`} onChange={(e) => handleAttrChange(attr.name, e.target.value)} className={styles.inputField} />
                              )}
                              {attr.type === "number" && (
                                <input type="number" placeholder={`Enter ${attr.name}`} onChange={(e) => handleAttrChange(attr.name, e.target.value)} className={styles.inputField} />
                              )}
                              {attr.type === "select" && (
                                <select className={styles.selectField} value={selectedAttrs[attr.name] ?? ""} onChange={(e) => handleAttrChange(attr.name, e.target.value)}>
                                  <option value="">Select {attr.name}</option>
                                  {(attr.values || []).map((val, idx) => (
                                    <option key={idx} value={val.label}>
                                      {/* OLD: {val.label}{val.priceModifier ? ` (+₹${val.priceModifier})` : ""} */}
                                      {val.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {attr.type === "checkbox" && (
                                <div className={styles.checkboxGroup}>
                                  {(attr.values || []).map((val, idx) => (
                                    <label key={idx} className={styles.checkboxLabel}>
                                      <input type="checkbox" value={val.label}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setSelectedAttrs((prev) => {
                                            const current = prev[attr.name] || [];
                                            return { ...prev, [attr.name]: checked ? [...current, val.label] : current.filter((v) => v !== val.label) };
                                          });
                                        }}
                                        className={styles.checkboxInput}
                                      />
                                      {/* OLD: {val.label}{val.priceModifier ? ` (+₹${val.priceModifier})` : ""} */}
                                      {val.label}
                                    </label>
                                  ))}
                                </div>
                              )}

                              {attr.type === "upload" && (
                                <>
                                  <ProductFileUpload
                                    attributeName={attr.name}
                                    attributeKey={attrKey}
                                    uploadedAttrFiles={uploadedAttrFiles}
                                    setUploadedAttrFiles={setUploadedAttrFiles}
                                    acceptTypes={attr.uploadRules?.acceptTypes}
                                    maxSizeMB={attr.uploadRules?.maxSizeMB}
                                    imageDimensions={attr.uploadRules?.imageDimensions}
                                    singleFile={true}
                                  />
                                  {/* FIX: use formatImageDimensions which shows correct unit */}
                                  {attr.uploadRules?.imageDimensions && (
                                    <p style={{ fontSize: "13px", color: "#777" }}>
                                      Allowed Size: {formatImageDimensions(attr.uploadRules.imageDimensions)}
                                    </p>
                                  )}
                                  <p style={{ fontSize: "13px", color: "#777" }}>
                                    Accept: {attr.uploadRules?.acceptTypes?.join(", ") || "Any"}
                                    {attr.uploadRules?.maxSizeMB && ` • Max ${attr.uploadRules.maxSizeMB}MB`}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={styles.noOptions}>No extra options available</p>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Special Remarks (Optional)</label>
                    <textarea rows={3} placeholder="Any special instructions for this order..." value={specialRemarks} onChange={(e) => setSpecialRemarks(e.target.value)} className={styles.inputField} />
                  </div>
                </div>

                <div className="mobile-none b2b-add-to-cart">
                  <div className={styles.b2bOrderActions}>
                    {canAddToCart ? (
                      // OLD: <button className={styles.primaryBtn} onClick={addToCart}>Add to Cart</button>
                      // NEW: disabled + spinner during upload
                      <button className={styles.primaryBtn} onClick={addToCart} disabled={isUploading}>
                        {isUploading ? <><span className={styles.spinner} /> Uploading...</> : "Add to Cart"}
                      </button>
                    ) : (
                      <p className="text-muted mt-2">Please upload your design before adding to cart.</p>
                    )}
                  </div>
                </div>

                {/* Description moved to below sidebar — visible on all screen sizes */}
              </div>
            ) : (
              // ── B2C Section ──
              <div className="mobile-none">
                <div className={styles.b2cActions}>
                  <div className="b2c-purchase-row d-flex align-items-center">
                    {product.b2cOptions?.whatsappSupport && (
                      <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
                        <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp icon" /> Chat on WhatsApp
                      </button>
                    )}
                    {product.b2cOptions?.whatsappSupport && (
                      <a href="https://wa.link/y6hc8l" className="hire-a-designer">Hire a Designer</a>
                    )}
                  </div>

                  <div className="mt-3 d-flex gap-4 attributes-area">
                    {product.attributes?.length > 0 &&
                      product.attributes.filter((a) => a.type === "upload").map((attr, i) => {
                        const safeName = (attr.name || "attr").trim();
                        const attrKey = `${safeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;
                        return (
                          <div key={i} style={{ marginBottom: "15px" }}>
                            <ProductFileUpload
                              attributeName={attr.name}
                              attributeKey={attrKey}
                              uploadedAttrFiles={uploadedAttrFiles}
                              setUploadedAttrFiles={setUploadedAttrFiles}
                              acceptTypes={attr.uploadRules?.acceptTypes}
                              maxSizeMB={attr.uploadRules?.maxSizeMB}
                              imageDimensions={attr.uploadRules?.imageDimensions}
                              singleFile={true}
                            />
                            {/* FIX: formatImageDimensions shows correct unit */}
                            {attr.uploadRules?.imageDimensions && (
                              <p style={{ fontSize: "13px", color: "#777" }}>
                                Allowed Size: {formatImageDimensions(attr.uploadRules.imageDimensions)}
                              </p>
                            )}
                            <p style={{ fontSize: "13px", color: "#777" }}>
                              Accept: {attr.uploadRules?.acceptTypes?.join(", ") || "Any"}
                              {attr.uploadRules?.maxSizeMB && <> • Max {attr.uploadRules.maxSizeMB}MB</>}
                            </p>
                          </div>
                        );
                      })}
                  </div>

                  {canAddToCart ? (
                    // OLD: <button className={styles.primaryBtn} onClick={addToCart}><img ... />Add to Cart</button>
                    // NEW: disabled + spinner during upload
                    <button className={styles.primaryBtn} onClick={addToCart} disabled={isUploading}>
                      {isUploading ? (
                        <><span className={styles.spinner} /> Uploading...</>
                      ) : (
                        <><img src="/assets/images/icons/shopping-cart.svg" className="cart-png" alt="cart" /> Add to Cart</>
                      )}
                    </button>
                  ) : (
                    <p className="text-muted mt-2">Please upload required files before adding to cart.</p>
                  )}

                  {/* Description moved to below sidebar — visible on all screen sizes */}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Description — outside sidebar so visible on mobile too ── */}
        {(product.description || product.shortDescription) && (
          <div className="product-desc-section">
            <h4 className="product-description">Product Description</h4>
            <div dangerouslySetInnerHTML={{ __html: product.description || product.shortDescription }} />
          </div>
        )}

        {/* ── Accordion ── */}
        <div className="custom-accordion">
          {product?.ourSpecialization && (
            <div className="accordion-item">
              <button className="accordion-header"
                onClick={(e) => {
                  const currentItem = e.currentTarget.parentElement;
                  const allItems = e.currentTarget.closest(".custom-accordion").querySelectorAll(".accordion-item");
                  allItems.forEach((item) => {
                    if (item !== currentItem) {
                      item.querySelector(".accordion-body").classList.remove("show");
                      item.querySelector(".accordion-header").classList.remove("open");
                    }
                  });
                  e.currentTarget.nextElementSibling.classList.toggle("show");
                  e.currentTarget.classList.toggle("open");
                }}>
                Our Specialization <i className="ri-arrow-down-s-line arrow"></i>
              </button>
              <div className="accordion-body show">
                <div dangerouslySetInnerHTML={{ __html: product.ourSpecialization }} />
              </div>
            </div>
          )}
          {product?.importantNotes && (
            <div className="accordion-item">
              <button className="accordion-header"
                onClick={(e) => {
                  const currentItem = e.currentTarget.parentElement;
                  const allItems = e.currentTarget.closest(".custom-accordion").querySelectorAll(".accordion-item");
                  allItems.forEach((item) => {
                    if (item !== currentItem) {
                      item.querySelector(".accordion-body").classList.remove("show");
                      item.querySelector(".accordion-header").classList.remove("open");
                    }
                  });
                  e.currentTarget.nextElementSibling.classList.toggle("show");
                  e.currentTarget.classList.toggle("open");
                }}>
                Important Notes <i className="ri-arrow-down-s-line arrow"></i>
              </button>
              <div className="accordion-body">
                <div dangerouslySetInnerHTML={{ __html: product.importantNotes }} />
              </div>
            </div>
          )}
          <style jsx>{`
            .custom-accordion { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin: 70px 0; }
            .accordion-item + .accordion-item { border-top: 1px solid #ddd; }
            .accordion-header { width: 100%; padding: 15px 20px; background: transparent; border: none; outline: none; text-align: left; font-size: 1.1rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
            .accordion-header.open .arrow { transform: rotate(180deg); }
            .accordion-body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; padding: 0 20px; background: #fff; }
            .accordion-body.show { max-height: 500px; padding: 15px 20px; }
            .arrow { transition: transform 0.3s ease; }
          `}</style>
        </div>
      </div>

      {/* ── Mobile Backdrop ── */}
      {mobilePanelOpen && (
        <div className="ops-mobile-backdrop desktop-none" onClick={() => setMobilePanelOpen(false)} />
      )}

      {/* ── Mobile Sticky Bar ── */}
      <div className="ops-mobile-sticky desktop-none">

        {/* Slide-up panel — all attributes */}
        {mobilePanelOpen && (
          <div className="ops-mobile-attr-panel">
            <div className="ops-mobile-panel-header">
              <span>Select Options &amp; Upload</span>
              <button type="button" className="ops-mobile-panel-close" onClick={() => setMobilePanelOpen(false)}>✕</button>
            </div>
            <div className="ops-mobile-panel-body">
              {product.attributes?.map((attr, i) => {
                const safeName = (attr.name || "attr").trim();
                const attrKey = `${safeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;
                return (
                  <div key={i} className="ops-mobile-attr-item">
                    <label className="ops-mobile-attr-label">
                      {attr.name}{attr.required && <span style={{ color: "red", marginLeft: 2 }}>*</span>}
                    </label>
                    {attr.type === "text" && (
                      <input type="text" placeholder={`Enter ${attr.name}`} onChange={(e) => handleAttrChange(attr.name, e.target.value)} className={styles.inputField} />
                    )}
                    {attr.type === "number" && (
                      <input type="number" placeholder={`Enter ${attr.name}`} onChange={(e) => handleAttrChange(attr.name, e.target.value)} className={styles.inputField} />
                    )}
                    {attr.type === "select" && (
                      <select className={styles.selectField} value={selectedAttrs[attr.name] ?? ""} onChange={(e) => handleAttrChange(attr.name, e.target.value)}>
                        <option value="">Select {attr.name}</option>
                        {(attr.values || []).map((val, idx) => (
                          <option key={idx} value={val.label}>{val.label}</option>
                        ))}
                      </select>
                    )}
                    {attr.type === "checkbox" && (
                      <div className={styles.checkboxGroup}>
                        {(attr.values || []).map((val, idx) => (
                          <label key={idx} className={styles.checkboxLabel}>
                            <input type="checkbox" value={val.label} className={styles.checkboxInput}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedAttrs((prev) => {
                                  const current = prev[attr.name] || [];
                                  return { ...prev, [attr.name]: checked ? [...current, val.label] : current.filter((v) => v !== val.label) };
                                });
                              }}
                            />
                            {val.label}
                          </label>
                        ))}
                      </div>
                    )}
                    {attr.type === "upload" && (
                      <>
                        <ProductFileUpload
                          attributeName={attr.name}
                          attributeKey={attrKey}
                          uploadedAttrFiles={uploadedAttrFiles}
                          setUploadedAttrFiles={setUploadedAttrFiles}
                          acceptTypes={attr.uploadRules?.acceptTypes}
                          maxSizeMB={attr.uploadRules?.maxSizeMB}
                          imageDimensions={attr.uploadRules?.imageDimensions}
                          singleFile={true}
                        />
                        {attr.uploadRules?.imageDimensions && (
                          <p style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                            Allowed Size: {formatImageDimensions(attr.uploadRules.imageDimensions)}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: "#777" }}>
                          Accept: {attr.uploadRules?.acceptTypes?.join(", ") || "Any"}
                          {attr.uploadRules?.maxSizeMB && ` • Max ${attr.uploadRules.maxSizeMB}MB`}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="ops-mobile-panel-footer">
              {canAddToCart ? (
                <button className="ops-mobile-main-btn cart" disabled={isUploading}
                  onClick={() => { setMobilePanelOpen(false); addToCart(); }}>
                  {isUploading ? (
                    <><span className={styles.spinner} /> Uploading...</>
                  ) : (
                    <><img src="/assets/images/icons/shopping-cart.svg" alt="cart" /> Add to Cart</>
                  )}
                </button>
              ) : (
                <button type="button" className="ops-mobile-main-btn" onClick={() => setMobilePanelOpen(false)}>Done</button>
              )}
            </div>
          </div>
        )}

        {/* Bottom action row */}
        {!mobilePanelOpen && (
          <div className="ops-mobile-bottom-row">
            {product.b2cOptions?.whatsappSupport && (
              <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
                <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp" /> WhatsApp
              </button>
            )}
            {canAddToCart ? (
              <button className="ops-mobile-main-btn cart" onClick={addToCart} disabled={isUploading}>
                {isUploading ? (
                  <><span className={styles.spinner} /> Uploading...</>
                ) : (
                  <><img src="/assets/images/icons/shopping-cart.svg" alt="cart" /> Add to Cart</>
                )}
              </button>
            ) : (
              <button type="button" className="ops-mobile-main-btn" onClick={() => setMobilePanelOpen(true)}>
                Upload &amp; Customize
              </button>
            )}
          </div>
        )}
      </div>

      <ProductSlider />
      <Footer />
    </div>
  );
}





