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

  const [specialRemarks, setSpecialRemarks] = useState("");

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [uploadedAttrFiles, setUploadedAttrFiles] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);

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
  // const [selectedFiles, setSelectedFiles] = useState([]);

  // Compute Add-to-Cart visibility safely



  const formatImageDimensions = (dim) => {
  if (!dim) return "";

  // Old products (string)
  if (typeof dim === "string") {
    return dim;
  }

  // New products (object)
  if (typeof dim === "object") {
    const unitLabel =
      dim.unit === "px"
        ? "px"
        : dim.unit === "mm"
        ? "mm"
        : dim.unit === "inch"
        ? "inch"
        : "";

    return `${dim.values}${unitLabel ? " " + unitLabel : ""}`;
  }

  return "";
};



  const canAddToCart = useMemo(() => {
    if (!product) return false;

    // legacy upload system (b2bOptions.allowFileUpload)
    const hasLegacyFile = uploadedFiles.length > 0;

    // new upload attributes system
    const hasAttributeUpload = Object.keys(uploadedAttrFiles).length > 0;

    // FINAL RULE (same as OLD LOGIC)
    return hasLegacyFile || hasAttributeUpload;
  }, [product, uploadedFiles, uploadedAttrFiles]);

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

  function calculateDynamicPrice(qty, tiers, baseTotalPrice, minOrderQty) {
    // Convert base price into artificial tier at minOrderQty
    const allTiers = [
      { minQty: minOrderQty, totalPrice: baseTotalPrice },
      ...tiers.map((t) => ({
        minQty: Number(t.minQty),
        totalPrice: Number(t.pricePerUnit),
      })),
    ].sort((a, b) => a.minQty - b.minQty);

    // Find first tier where minQty >= qty
    let matchingTier = allTiers.find((t) => qty <= t.minQty);

    if (!matchingTier) {
      // No tier large enough → use last tier for per-unit rate
      const last = allTiers[allTiers.length - 1];
      const perUnit = last.totalPrice / last.minQty;
      return qty * perUnit;
    } else {
      // Use matching tier per-unit rate
      const perUnit = matchingTier.totalPrice / matchingTier.minQty;
      return qty * perUnit;
    }
  }

  const finalPrice = useMemo(() => {
    if (!product) return 0;

    const minQty = product.minOrderQty || 1;
    const effectiveQty = qty < minQty ? minQty : qty;

    // STEP 1: Count how many batches (100 qty batch, 200 qty = 2 batches, 300 = 3 batches)
    const batchCount = effectiveQty / minQty;

    // STEP 2: Get base tier price using your existing tier logic
    const baseTierPrice = calculateDynamicPrice(
      effectiveQty,
      product.pricingTiers,
      Number(product.basePrice),
      minQty
    );

    // STEP 3: Calculate attribute extra PER BATCH (not per unit)
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

    // STEP 4: Multiply attribute cost by number of batches
    const attributeCost = attrExtraPerBatch * batchCount;

    // FINAL PRICE
    return baseTierPrice + attributeCost;
  }, [product, qty, selectedAttrs]);

  // build allowed quantity steps from min order + tiers
  const quantityLadder = useMemo(() => {
    if (!product) return [];

    const base = Number(product.minOrderQty || 1);

    // Collect tiers' minQty (ensure numbers)
    const tierQtys = (product.pricingTiers || [])
      .map((t) => Number(t.minQty))
      .filter((n) => !isNaN(n) && n > 0);

    // combine and unique + sort
    const all = Array.from(new Set([base, ...tierQtys])).sort((a, b) => a - b);
    return all;
  }, [product]);

  const increaseQty = () => {
    const list = quantityLadder;
    if (!list.length) return;
    const current = Number(qty);

    // find first entry strictly greater than current
    for (let i = 0; i < list.length; i++) {
      if (list[i] > current) {
        setQty(list[i]);
        return;
      }
    }

    // if already at or above last, keep last tier
    setQty(list[list.length - 1]);
  };

  const decreaseQty = () => {
    const list = quantityLadder;
    if (!list.length) return;
    const current = Number(qty);

    // find first entry strictly less than current from the end
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] < current) {
        setQty(list[i]);
        return;
      }
    }

    // if already at or below first, set to minimum
    setQty(list[0]);
  };

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

  const validateUploadAttrs = () => {
    // use safe guards
    const uploadAttrs =
      product?.attributes?.filter((a) => a.type === "upload") || [];
    if (uploadAttrs.length === 0) return true;

    for (let i = 0; i < uploadAttrs.length; i++) {
      const a = uploadAttrs[i];
      const safeName = (a.name || "attr").trim();
      const attrKey = `${safeName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;

      if (a.uploadRules?.required && !uploadedAttrFiles[attrKey]) {
        toast.error(`Please upload file for "${a.name}"`);
        return false;
      }
    }
    return true;
  };

  const addToCart = async () => {
    if (!product) return toast.error("Product not loaded");

    // 🔥 New validation for attribute-based uploads
    if (!validateUploadAttrs()) return;

    const token = localStorage.getItem("token");
    if (!token) return toast.error("Please login first");

    try {
      // 1️⃣ First upload attribute files (if any)
      let uploadedAttrUrls = [];

      if (Object.keys(uploadedAttrFiles).length > 0) {
        const fd = new FormData();
        const attrMap = {}; // mapping attrKey -> human name

        Object.keys(uploadedAttrFiles).forEach((attrKey) => {
          const file = uploadedAttrFiles[attrKey];
          fd.append(attrKey, file); // fieldname is the attrKey
          // derive attributeName from attrKey mapping: we need to find attribute human name
          // You should have stored mapping in uploadedAttrFiles value or we create attrMap here by reading product.attributes
          // Build mapping by matching attrKey to product.attributes index:
          const idx = attrKey.split("__").pop();
          const attrObj = product.attributes?.[Number(idx)];
          attrMap[attrKey] = (attrObj && attrObj.name) || attrKey;
        });

        // Send mapping so server can store readable attribute names
        fd.append("productId", product._id);
        fd.append("attrMap", JSON.stringify(attrMap));

        const uploadRes = await axios.post("/api/upload/save-design", fd, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        uploadedAttrUrls = uploadRes.data.data.map((f) => ({
          attributeKey: f.attribute, // attrKey
          attributeName: f.attributeName || attrMap[f.attribute] || f.attribute,
          url: f.fileUrl,
          name: f.fileName,
        }));
      }

      // 2️⃣ Add to cart now (including new uploaded attribute files)
      const res = await axios.post(
        "/api/cart",
        {
          productId: product._id,
          quantity: qty,
          selectedAttrs,
          price: finalPrice,

          remarks: specialRemarks,

          // legacy upload files
          uploadedFiles: uploadedFiles.map((f) => f.url),

          // NEW upload attribute files
          uploadedAttributeFiles: uploadedAttrUrls,
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

                
                <div className={styles.b2bOrderSection} id="b2border-section">


                  {/* Quantity (tier-stepper) */}
                 
                 <div className="b2b-container-area">
                    <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Quantity</label>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <button
                        type="button"
                        onClick={decreaseQty}
                        aria-label="Decrease quantity"
                        className="quantity-btns"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        value={qty}
                        readOnly
                        className={styles.inputField}
                        style={{ width: "100px", textAlign: "center" }}
                      />

                      <button
                        type="button"
                        onClick={increaseQty}
                        aria-label="Increase quantity"
                        className="quantity-btns"
                      >
                        +
                      </button>


                      
                    </div>

                    {/* <small className={styles.helperText}>
                      Minimum order: {product.minOrderQty || 1}
                    </small> */}
                  </div>


                    <div className="whats-appbtn">
                    
      
                      <a href="https://wa.link/y6hc8l"
                        className="hire-a-designer"
                      >
                       Hire a Designer
                      </a>
                  </div>
                 </div>
        

                 


                 <div className="d-flex gap-4 attributes-area">
                      {/* Attributes (ALL types) */}
                  {product.attributes?.length ? (
                    product.attributes.map((attr, i) => {
                      const safeName = (attr.name || "attr").trim();
                      const attrKey = `${safeName
                        .replace(/\s+/g, "_")
                        .replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;

                      return (
                      <div className="mobile-none">
                        <div key={i} className={styles.inputGroup}>
                          <label className={styles.inputLabel}>
                            {attr.name}{" "}
                            {attr.required && (
                              <span className={styles.required}>*</span>
                            )}
                          </label>

                          {/* TEXT */}
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

                          {/* NUMBER */}
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

                          {/* SELECT */}
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
                                  {val.label}
                                  {val.priceModifier
                                    ? ` (+₹${val.priceModifier})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* CHECKBOX */}
                          {attr.type === "checkbox" && (
                            <div className={styles.checkboxGroup}>
                              {(attr.values || []).map((val, idx) => (
                                <label
                                  key={idx}
                                  className={styles.checkboxLabel}
                                >
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
                                  {val.label}
                                  {val.priceModifier
                                    ? ` (+₹${val.priceModifier})`
                                    : ""}
                                </label>
                              ))}
                            </div>
                          )}

                          {/* UPLOAD TYPE (NEW) */}
                 
                            {attr.type === "upload" && (
                              <>
                                <ProductFileUpload
                                  attributeName={attr.name}
                                  attributeKey={attrKey}
                                  uploadedAttrFiles={uploadedAttrFiles}
                                  setUploadedAttrFiles={setUploadedAttrFiles}
                                  acceptTypes={attr.uploadRules?.acceptTypes}
                                  maxSizeMB={attr.uploadRules?.maxSizeMB}
                                  imageDimensions={
                                    attr.uploadRules?.imageDimensions
                                  }
                                  singleFile={true}
                                />

                                {/* Info text */}
                                {attr.uploadRules?.imageDimensions && (
                                  <p
                                    style={{ fontSize: "13px", color: "#777" }}
                                  >
                                    Allowed Size(s):{" "}
                                    {/* {attr.uploadRules.imageDimensions} */}

                                    {formatImageDimensions(attr.uploadRules?.imageDimensions)}

                                  </p>
                                )}

                                <p style={{ fontSize: "13px", color: "#777" }}>
                                  Accept:{" "}
                                  {attr.uploadRules?.acceptTypes?.join(", ") ||
                                    "Any"}
                                  {attr.uploadRules?.maxSizeMB &&
                                    ` • Max ${attr.uploadRules.maxSizeMB}MB`}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.noOptions}>
                      No extra options available
                    </p>
                  )}
                 </div>

                 <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Special Remarks (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Any special instructions for this order..."
                      value={specialRemarks}
                      onChange={(e) => setSpecialRemarks(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                </div>

                <div className="mobile-none b2b-add-to-cart">
                  <div className={styles.b2bOrderActions}>
                    {/* 🔥 After upload, Add to Cart shows (your existing logic works) */}
                    {canAddToCart ? (
                      <button className={styles.primaryBtn} onClick={addToCart}>
                        Add to Cart
                      </button>
                    ) : (
                      <p className="text-muted mt-2">
                        Please upload your design before adding to cart.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // B2C Section
              <div className="mobile-none">
                <div className={styles.b2cActions}>
                  <div className="b2c-purchase-row d-flex  align-items-center">
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

                     {product.b2cOptions?.whatsappSupport && (
                      <a href="https://wa.link/y6hc8l"
                        className="hire-a-designer"
                      >
                       Hire a Designer
                      </a>
                      
                    )}
                </div>
                <div className="mt-3 d-flex gap-4 attributes-area">
                    {/* B2C attribute uploads */}
                    {product.attributes?.length > 0 &&
                      product.attributes
                        .filter((a) => a.type === "upload")
                        .map((attr, i) => {
                          const safeName = (attr.name || "attr").trim();
                          const attrKey = `${safeName
                            .replace(/\s+/g, "_")
                            .replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;

                          return (
                            <div key={i} style={{ marginBottom: "15px" }}>
                              <ProductFileUpload
                                attributeName={attr.name}
                                attributeKey={attrKey}
                                uploadedAttrFiles={uploadedAttrFiles}
                                setUploadedAttrFiles={setUploadedAttrFiles}
                                acceptTypes={attr.uploadRules?.acceptTypes}
                                maxSizeMB={attr.uploadRules?.maxSizeMB}
                                imageDimensions={
                                  attr.uploadRules?.imageDimensions
                                }
                                singleFile={true}
                              />

                              {/* info text */}
                              {attr.uploadRules?.imageDimensions && (
                                <p style={{ fontSize: "13px", color: "#777" }}>
                                  Allowed Size(s):{" "}
                                  {/* {attr.uploadRules.imageDimensions} */}
                                  {formatImageDimensions(attr.uploadRules?.imageDimensions)}

                                  
                                </p>
                              )}

                              <p style={{ fontSize: "13px", color: "#777" }}>
                                Accept:{" "}
                                {attr.uploadRules?.acceptTypes?.join(", ") ||
                                  "Any"}{" "}
                                {attr.uploadRules?.maxSizeMB && (
                                  <>• Max {attr.uploadRules.maxSizeMB}MB</>
                                )}
                              </p>
                            </div>
                          );
                        })}

                   
                  </div>

                  {/* b2c add to cart button  */}

                  {canAddToCart ? (
                    <button className={styles.primaryBtn} onClick={addToCart}>
                      <img
                        src="/assets/images/icons/shopping-cart.svg"
                        className="cart-png"
                      />
                      Add to Cart
                    </button>
                  ) : (
                    <p className="text-muted mt-2">
                      Please upload required files before adding to cart.
                    </p>
                  )}
                  {/* 
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
                  )} */}

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
              margin: 70px 0;
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

      {/* MOBILE STICKY BAR */}
      <div className="ops-mobile-sticky desktop-none">
        {/* Show upload panel when files not uploaded */}
        {!mobilePanelOpen && Object.keys(uploadedAttrFiles).length === 0 && (
          <div className="desktop-none">
            <div className="mobile-whtasapp d-flex align-items-center justify-between gap-2">
              {/* WhatsApp button */} 
              
              
              {product.b2cOptions?.whatsappSupport && (
                      <a href="https://wa.link/y6hc8l"
                        className="hire-a-designer"
                      >
                       Hire a Designer
                      </a>
                      
                    )}


              {product.b2cOptions?.whatsappSupport && (
                <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
                  <img src="/assets/images/icons/whatsapp.svg" alt="whatsapp" />
                  WhatsApp
                </button>
              )}

              {/* Attribute uploads */}
              {product.attributes
                ?.filter((a) => a.type === "upload")
                .map((attr, i) => {
                  const safeName = (attr.name || "attr").trim();
                  const attrKey = `${safeName
                    .replace(/\s+/g, "_")
                    .replace(/[^a-zA-Z0-9_]/g, "")}__${i}`;

                  return (
                    <ProductFileUpload
                      key={i}
                      attributeName={attr.name}
                      attributeKey={attrKey}
                      uploadedAttrFiles={uploadedAttrFiles}
                      setUploadedAttrFiles={setUploadedAttrFiles}
                      acceptTypes={attr.uploadRules?.acceptTypes}
                      maxSizeMB={attr.uploadRules?.maxSizeMB}
                      imageDimensions={attr.uploadRules?.imageDimensions}
                      singleFile={true}
                    />
                  );
                })}
            </div>
          </div>
        )}

        {/* Show add to cart after upload */}
        {!mobilePanelOpen && canAddToCart && (
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

// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// // import toast from "react-hot-toast";
// // Use this:
// import { toast } from "react-hot-toast";

// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import styles from "@/styles/ProductDetails.module.css";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import CustomAccordion from "@/components/products/Features";
// import Offcanvas from "@/components/header/Offcanvas";
// import ProductFileUpload from "@/components/ProductFileUpload";
// // import { toast } from "sonner";

// export default function ProductDetails() {
//   const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
//     files.forEach((f) => fd.append("file", f)); // ✅ single field name = "file"
//     fd.append("productId", product._id);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Please login first");

//       // 1️⃣ Upload to /api/upload/save-design (saves file physically + DB entry)
//       const res = await axios.post("/api/upload/save-design", fd, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       console.log("Upload response:", res.data);

//       // 2️⃣ Save uploaded URLs locally for add-to-cart
//       const uploaded = (res.data.data || []).map((file) => ({
//         url: file.fileUrl,
//         name: file.fileName,
//       }));

//       setUploadedFiles(uploaded);
//       toast.success("Design files uploaded successfully!");
//     } catch (err) {
//       console.error("Upload failed:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Upload failed");
//     }
//   };

// function calculateDynamicPrice(qty, tiers, baseTotalPrice, minOrderQty) {
//   // Convert base price into artificial tier at minOrderQty
//   const allTiers = [
//     { minQty: minOrderQty, totalPrice: baseTotalPrice },
//     ...tiers.map(t => ({
//       minQty: Number(t.minQty),
//       totalPrice: Number(t.pricePerUnit),
//     })),
//   ].sort((a, b) => a.minQty - b.minQty);

//   // Find first tier where minQty >= qty
//   let matchingTier = allTiers.find(t => qty <= t.minQty);

//   if (!matchingTier) {
//     // No tier large enough → use last tier for per-unit rate
//     const last = allTiers[allTiers.length - 1];
//     const perUnit = last.totalPrice / last.minQty;
//     return qty * perUnit;
//   } else {
//     // Use matching tier per-unit rate
//     const perUnit = matchingTier.totalPrice / matchingTier.minQty;
//     return qty * perUnit;
//   }
// }

// const finalPrice = useMemo(() => {
//   if (!product) return 0;

//   const minQty = product.minOrderQty || 1;
//   const effectiveQty = qty < minQty ? minQty : qty;

//   // STEP 1: Count how many batches (100 qty batch, 200 qty = 2 batches, 300 = 3 batches)
//   const batchCount = effectiveQty / minQty;

//   // STEP 2: Get base tier price using your existing tier logic
//   const baseTierPrice = calculateDynamicPrice(
//     effectiveQty,
//     product.pricingTiers,
//     Number(product.basePrice),
//     minQty
//   );

//   // STEP 3: Calculate attribute extra PER BATCH (not per unit)
//   let attrExtraPerBatch = 0;

//   (product.attributes || []).forEach((attr) => {
//     const sel = selectedAttrs[attr.name];
//     if (!sel) return;

//     if (attr.type === "select") {
//       const opt = (attr.values || []).find((v) => v.label === sel);
//       if (opt) attrExtraPerBatch += Number(opt.priceModifier || 0);
//     }

//     if (attr.type === "checkbox") {
//       (Array.isArray(sel) ? sel : []).forEach((label) => {
//         const opt = (attr.values || []).find((v) => v.label === label);
//         if (opt) attrExtraPerBatch += Number(opt.priceModifier || 0);
//       });
//     }

//     if (attr.type === "number") {
//       const numeric = Number(sel);
//       if (!isNaN(numeric)) attrExtraPerBatch += numeric;
//     }
//   });

//   // STEP 4: Multiply attribute cost by number of batches
//   const attributeCost = attrExtraPerBatch * batchCount;

//   // FINAL PRICE
//   return baseTierPrice + attributeCost;

// }, [product, qty, selectedAttrs]);

// // build allowed quantity steps from min order + tiers
// const quantityLadder = useMemo(() => {
//   if (!product) return [];

//   const base = Number(product.minOrderQty || 1);

//   // Collect tiers' minQty (ensure numbers)
//   const tierQtys = (product.pricingTiers || [])
//     .map((t) => Number(t.minQty))
//     .filter((n) => !isNaN(n) && n > 0);

//   // combine and unique + sort
//   const all = Array.from(new Set([base, ...tierQtys])).sort((a, b) => a - b);
//   return all;
// }, [product]);

// const increaseQty = () => {
//   const list = quantityLadder;
//   if (!list.length) return;
//   const current = Number(qty);

//   // find first entry strictly greater than current
//   for (let i = 0; i < list.length; i++) {
//     if (list[i] > current) {
//       setQty(list[i]);
//       return;
//     }
//   }

//   // if already at or above last, keep last tier
//   setQty(list[list.length - 1]);
// };

// const decreaseQty = () => {
//   const list = quantityLadder;
//   if (!list.length) return;
//   const current = Number(qty);

//   // find first entry strictly less than current from the end
//   for (let i = list.length - 1; i >= 0; i--) {
//     if (list[i] < current) {
//       setQty(list[i]);
//       return;
//     }
//   }

//   // if already at or below first, set to minimum
//   setQty(list[0]);
// };

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
//     const message = "Hi, I want to know more about this product.";

//     const url = `https://wa.me/${
//       product?.b2cOptions?.whatsappNumber || "918081815141"
//     }?text=${encodeURIComponent(message)}`;

//     window.open(url, "_blank");
//   };

//   const addToCart = async () => {
//     if (!product) return toast.error("Product not loaded");

//     const token = localStorage.getItem("token");
//     if (!token) return toast.error("Please login first");

//     try {
//       const res = await axios.post(
//         "/api/cart",
//         {
//           productId: product._id,
//           quantity: qty,
//           selectedAttrs,
//           uploadedFiles: uploadedFiles.map((f) => f.url), // ✅ clean URLs only
//           price: finalPrice,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       toast.success("Added to cart");
//       router.push("/cart");
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to add to cart");
//     }
//   };

//   return (
//     <div className="product-details">
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
//       <Topbar />
//       <Offcanvas />
//       <div className="container padding-top-40">
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
//               <img
//                 src={activeImage}
//                 alt={product.name}
//                 className="pr-details-main-img"
//               />
//               <div className={styles.gallery} id="product-gallery">
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
//           <aside className={styles.sidebar} id="side-bar">
//             <h1 className={styles.title}>{product.name}</h1>
//             <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
//             <p className="product-min-order">
//               Minimum Order: {product.minOrderQty}
//             </p>

//             {/* B2B Section */}
//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <div className="mobile-none">
//                   {/* 🔥 Show Upload button ONLY if no uploaded files */}
//                   {product.b2bOptions?.allowFileUpload &&
//                     uploadedFiles.length === 0 && (
//                       <ProductFileUpload
//                         product={product}
//                         selectedFiles={selectedFiles}
//                         setSelectedFiles={setSelectedFiles}
//                         setFiles={setFiles}
//                         uploadFiles={uploadFiles}
//                       />
//                     )}
//                 </div>

//                 <div className={styles.b2bOrderSection} id="b2border-section">
//                   {/* Quantity */}
//                {/* Quantity (tier-stepper) */}
// <div className={styles.inputGroup}>
//   <label className={styles.inputLabel}>Quantity</label>

//   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//     <button
//       type="button"
//       onClick={decreaseQty}
//       aria-label="Decrease quantity"
//       className="quantity-btns"
//     >
//       -
//     </button>

//     <input
//       type="text"
//       value={qty}
//       readOnly
//       className={styles.inputField}
//       style={{ width: "100px", textAlign: "center" }}
//     />

//     <button
//       type="button"
//       onClick={increaseQty}
//       aria-label="Increase quantity"
//       className="quantity-btns"
//     >
//       +
//     </button>
//   </div>

//   <small className={styles.helperText}>
//     Minimum order: {product.minOrderQty || 1}
//   </small>
// </div>

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

//                         {/* (attributes unchanged) */}
//                         {/* your original UI for text, select, number, checkbox */}
//                           {attr.type === "text" && (
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
//                             className={styles.selectField}
//                             value={selectedAttrs[attr.name] ?? ""}
//                             onChange={(e) =>
//                               handleAttrChange(attr.name, e.target.value)
//                             }
//                           >
//                             <option value="">Select {attr.name}</option>
//                             {(attr.values || []).map((val, idx) => (
//                               <option key={idx} value={val.label}>
//                                 {val.label}{" "}
//                                 {val.priceModifier
//                                   ? `( +₹${val.priceModifier} )`
//                                   : ""}
//                               </option>
//                             ))}
//                           </select>
//                         )}

//                         {attr.type === "checkbox" && (
//                           <div className={styles.checkboxGroup}>
//                             {(attr.values || []).map((val, idx) => (
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
//                                   ? `( +₹${val.priceModifier} )`
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

//                 <div className="mobile-none b2b-add-to-cart">
//                   <div className={styles.b2bOrderActions}>
//                     {/* 🔥 After upload, Add to Cart shows (your existing logic works) */}
//                     {!product.b2bOptions.allowFileUpload ||
//                     uploadedFiles.length > 0 ? (
//                       <button className={styles.primaryBtn} onClick={addToCart}>
//                         <img
//                           className="cart-b2b"
//                           src="/assets/images/icons/shopping-cart.svg"
//                           alt="cart icon"
//                         />{" "}
//                         Add to Cart
//                       </button>
//                     ) : (
//                       <p className="text-muted mt-2">
//                         Please upload your design before adding to cart.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               // B2C Section
//               <div className="mobile-none">
//                 <div className={styles.b2cActions}>
//                   <div className="b2c-purchase-row d-flex  align-items-center">
//                     {product.b2cOptions?.whatsappSupport && (
//                       <button
//                         className={styles.whatsappBtn}
//                         onClick={handleWhatsapp}
//                       >
//                         <img
//                           src="/assets/images/icons/whatsapp.svg"
//                           alt="whatsapp icon"
//                         />{" "}
//                         Chat on WhatsApp
//                       </button>
//                     )}

//                     {product.b2cOptions?.designUpload &&
//                       uploadedFiles.length === 0 && (
//                         <ProductFileUpload
//                           product={product}
//                           selectedFiles={selectedFiles}
//                           setSelectedFiles={setSelectedFiles}
//                           setFiles={setFiles}
//                           uploadFiles={uploadFiles}
//                         />
//                       )}

//                     {uploadedFiles.length > 0 && (
//                       <button className={styles.primaryBtn} onClick={addToCart}>
//                         <img
//                           src="/assets/images/icons/shopping-cart.svg"
//                           alt="cart icon"
//                           className="cart-png"
//                         />
//                         Add to Cart
//                       </button>
//                     )}
//                   </div>

//                   {/* b2c add to cart button  */}
//                   {/*
//                   {!product.b2cOptions?.designUpload ||
//                   uploadedFiles.length > 0 ? (
//                     <button className={styles.primaryBtn} onClick={addToCart}>
//                       <img
//                         src="/assets/images/icons/shopping-cart.svg"
//                         alt="cart icon"
//                       />{" "}
//                       Add to Cart
//                     </button>
//                   ) : (
//                     <p className="text-muted mt-2">
//                       Please upload your design before adding to cart.
//                     </p>
//                   )} */}

//                   <h4 className="product-description">Product Description</h4>
//                   <div
//                     className={styles.description}
//                     dangerouslySetInnerHTML={{
//                       __html: product.description || product.shortDescription,
//                     }}
//                   />
//                 </div>
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
//       {/* for b2b users mobile version */}

//       {/* MOBILE BOTTOM STICKY BAR */}
//       <div className="ops-mobile-sticky desktop-none">
//         {/* BUTTON AREA  */}
//         {!mobilePanelOpen && uploadedFiles.length === 0 && (
//           <div className="desktop-none">
//             <div className="mobile-whtasapp d-flex  align-items-center justify-between">
//               {product.b2cOptions?.whatsappSupport && (
//                 <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
//                   <img
//                     src="/assets/images/icons/whatsapp.svg"
//                     alt="whatsapp icon"
//                   />{" "}
//                   WhatsApp
//                 </button>
//               )}

//               <ProductFileUpload
//                 product={product}
//                 selectedFiles={selectedFiles}
//                 setSelectedFiles={setSelectedFiles}
//                 setFiles={setFiles} // REQUIRED
//                 uploadFiles={uploadFiles}
//               />
//             </div>
//           </div>
//         )}

//         {!mobilePanelOpen && uploadedFiles.length > 0 && (
//           <button className="ops-mobile-main-btn cart" onClick={addToCart}>
//             <img src="/assets/images/icons/shopping-cart.svg" />
//             Add to Cart
//           </button>
//         )}
//       </div>

//       <ProductSlider />

//       <Footer />
//     </div>
//   );
// }

// // pages/products/[id].js
// import { useRouter } from "next/router";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// // import toast from "react-hot-toast";
// // Use this:
// import { toast } from "react-hot-toast";

// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import styles from "@/styles/ProductDetails.module.css";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import CustomAccordion from "@/components/products/Features";
// import Offcanvas from "@/components/header/Offcanvas";
// import ProductFileUpload from "@/components/ProductFileUpload";
// // import { toast } from "sonner";

// export default function ProductDetails() {
//   const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
//     files.forEach((f) => fd.append("file", f)); // ✅ single field name = "file"
//     fd.append("productId", product._id);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Please login first");

//       // 1️⃣ Upload to /api/upload/save-design (saves file physically + DB entry)
//       const res = await axios.post("/api/upload/save-design", fd, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       console.log("Upload response:", res.data);

//       // 2️⃣ Save uploaded URLs locally for add-to-cart
//       const uploaded = (res.data.data || []).map((file) => ({
//         url: file.fileUrl,
//         name: file.fileName,
//       }));

//       setUploadedFiles(uploaded);
//       toast.success("Design files uploaded successfully!");
//     } catch (err) {
//       console.error("Upload failed:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Upload failed");
//     }
//   };

//   const finalPrice = useMemo(() => {
//     if (!product) return 0;

//     const minQty = product.minOrderQty || 1;
//     const basePrice = Number(product.salePrice ?? product.basePrice ?? 0);
//     const effectiveQty = qty < minQty ? minQty : qty;

//     // 🧩 Calculate total modifier from selected attributes (per batch)
//     let attrExtra = 0;
//     (product.attributes || []).forEach((attr) => {
//       const sel = selectedAttrs[attr.name];
//       if (!sel) return;

//       if (attr.type === "select") {
//         const opt = (attr.values || []).find((v) => v.label === sel);
//         if (opt) attrExtra += Number(opt.priceModifier || 0);
//       }

//       if (attr.type === "checkbox") {
//         (Array.isArray(sel) ? sel : []).forEach((label) => {
//           const opt = (attr.values || []).find((v) => v.label === label);
//           if (opt) attrExtra += Number(opt.priceModifier || 0);
//         });
//       }

//       if (attr.type === "number") {
//         const numericVal = Number(sel || 0);
//         if (!isNaN(numericVal)) attrExtra += numericVal;
//       }
//     });

//     // 🧮 Price logic:
//     // Base price applies per batch (minQty)
//     // e.g. Visiting Card: ₹240 for 1000 pcs
//     // If user selects 2000, it becomes 2 batches → 240 * (2000/1000)
//     const batchMultiplier = effectiveQty / minQty;

//     // total = (base price + attribute modifiers) × number of batches
//     const total = (basePrice + attrExtra) * batchMultiplier;

//     return total;
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
//     const message = "Hi, I want to know more about this product.";

//     const url = `https://wa.me/${
//       product?.b2cOptions?.whatsappNumber || "918081815141"
//     }?text=${encodeURIComponent(message)}`;

//     window.open(url, "_blank");
//   };

//   const addToCart = async () => {
//     if (!product) return toast.error("Product not loaded");

//     const token = localStorage.getItem("token");
//     if (!token) return toast.error("Please login first");

//     try {
//       const res = await axios.post(
//         "/api/cart",
//         {
//           productId: product._id,
//           quantity: qty,
//           selectedAttrs,
//           uploadedFiles: uploadedFiles.map((f) => f.url), // ✅ clean URLs only
//           price: finalPrice,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       toast.success("Added to cart");
//       router.push("/cart");
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Failed to add to cart");
//     }
//   };

//   return (
//     <div className="product-details">
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
//       <Topbar />
//       <Offcanvas />
//       <div className="container padding-top-40">
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
//               <img
//                 src={activeImage}
//                 alt={product.name}
//                 className="pr-details-main-img"
//               />
//               <div className={styles.gallery} id="product-gallery">
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
//           <aside className={styles.sidebar} id="side-bar">
//             <h1 className={styles.title}>{product.name}</h1>
//             <div className={styles.price}>₹{finalPrice.toFixed(2)}</div>
//             <p className="product-min-order">
//               Minimum Order: {product.minOrderQty}
//             </p>

//             {/* B2B Section */}
//             {product.b2bOptions?.enabled ? (
//               <div className={styles.b2bForm}>
//                 <div className="mobile-none">
//                   {/* 🔥 Show Upload button ONLY if no uploaded files */}
//                   {product.b2bOptions?.allowFileUpload &&
//                     uploadedFiles.length === 0 && (
//                       <ProductFileUpload
//                         product={product}
//                         selectedFiles={selectedFiles}
//                         setSelectedFiles={setSelectedFiles}
//                         setFiles={setFiles}
//                         uploadFiles={uploadFiles}
//                       />
//                     )}
//                 </div>

//                 <div className={styles.b2bOrderSection} id="b2border-section">
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

//                         {/* (attributes unchanged) */}
//                         {/* your original UI for text, select, number, checkbox */}
//                           {attr.type === "text" && (
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
//                             className={styles.selectField}
//                             value={selectedAttrs[attr.name] ?? ""}
//                             onChange={(e) =>
//                               handleAttrChange(attr.name, e.target.value)
//                             }
//                           >
//                             <option value="">Select {attr.name}</option>
//                             {(attr.values || []).map((val, idx) => (
//                               <option key={idx} value={val.label}>
//                                 {val.label}{" "}
//                                 {val.priceModifier
//                                   ? `( +₹${val.priceModifier} )`
//                                   : ""}
//                               </option>
//                             ))}
//                           </select>
//                         )}

//                         {attr.type === "checkbox" && (
//                           <div className={styles.checkboxGroup}>
//                             {(attr.values || []).map((val, idx) => (
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
//                                   ? `( +₹${val.priceModifier} )`
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

//                 <div className="mobile-none b2b-add-to-cart">
//                   <div className={styles.b2bOrderActions}>
//                     {/* 🔥 After upload, Add to Cart shows (your existing logic works) */}
//                     {!product.b2bOptions.allowFileUpload ||
//                     uploadedFiles.length > 0 ? (
//                       <button className={styles.primaryBtn} onClick={addToCart}>
//                         <img
//                           className="cart-b2b"
//                           src="/assets/images/icons/shopping-cart.svg"
//                           alt="cart icon"
//                         />{" "}
//                         Add to Cart
//                       </button>
//                     ) : (
//                       <p className="text-muted mt-2">
//                         Please upload your design before adding to cart.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               // B2C Section
//               <div className="mobile-none">
//                 <div className={styles.b2cActions}>
//                   <div className="b2c-purchase-row d-flex  align-items-center">
//                     {product.b2cOptions?.whatsappSupport && (
//                       <button
//                         className={styles.whatsappBtn}
//                         onClick={handleWhatsapp}
//                       >
//                         <img
//                           src="/assets/images/icons/whatsapp.svg"
//                           alt="whatsapp icon"
//                         />{" "}
//                         Chat on WhatsApp
//                       </button>
//                     )}

//                     {product.b2cOptions?.designUpload &&
//                       uploadedFiles.length === 0 && (
//                         <ProductFileUpload
//                           product={product}
//                           selectedFiles={selectedFiles}
//                           setSelectedFiles={setSelectedFiles}
//                           setFiles={setFiles}
//                           uploadFiles={uploadFiles}
//                         />
//                       )}

//                     {uploadedFiles.length > 0 && (
//                       <button className={styles.primaryBtn} onClick={addToCart}>
//                         <img
//                           src="/assets/images/icons/shopping-cart.svg"
//                           alt="cart icon"
//                           className="cart-png"
//                         />
//                         Add to Cart
//                       </button>
//                     )}
//                   </div>

//                   {/* b2c add to cart button  */}
//                   {/*
//                   {!product.b2cOptions?.designUpload ||
//                   uploadedFiles.length > 0 ? (
//                     <button className={styles.primaryBtn} onClick={addToCart}>
//                       <img
//                         src="/assets/images/icons/shopping-cart.svg"
//                         alt="cart icon"
//                       />{" "}
//                       Add to Cart
//                     </button>
//                   ) : (
//                     <p className="text-muted mt-2">
//                       Please upload your design before adding to cart.
//                     </p>
//                   )} */}

//                   <h4 className="product-description">Product Description</h4>
//                   <div
//                     className={styles.description}
//                     dangerouslySetInnerHTML={{
//                       __html: product.description || product.shortDescription,
//                     }}
//                   />
//                 </div>
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
//       {/* for b2b users mobile version */}

//       {/* MOBILE BOTTOM STICKY BAR */}
//       <div className="ops-mobile-sticky desktop-none">
//         {/* BUTTON AREA  */}
//         {!mobilePanelOpen && uploadedFiles.length === 0 && (
//           <div className="desktop-none">
//             <div className="mobile-whtasapp d-flex  align-items-center justify-between">
//               {product.b2cOptions?.whatsappSupport && (
//                 <button className={styles.whatsappBtn} onClick={handleWhatsapp}>
//                   <img
//                     src="/assets/images/icons/whatsapp.svg"
//                     alt="whatsapp icon"
//                   />{" "}
//                   WhatsApp
//                 </button>
//               )}

//               <ProductFileUpload
//                 product={product}
//                 selectedFiles={selectedFiles}
//                 setSelectedFiles={setSelectedFiles}
//                 setFiles={setFiles} // REQUIRED
//                 uploadFiles={uploadFiles}
//               />
//             </div>
//           </div>
//         )}

//         {!mobilePanelOpen && uploadedFiles.length > 0 && (
//           <button className="ops-mobile-main-btn cart" onClick={addToCart}>
//             <img src="/assets/images/icons/shopping-cart.svg" />
//             Add to Cart
//           </button>
//         )}
//       </div>

//       <ProductSlider />

//       <Footer />
//     </div>
//   );
// }
