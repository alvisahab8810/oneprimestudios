// components/ProductFileUpload.jsx
// FIXES IN THIS VERSION:
// 1. PDF MIME type fallback — also checks by file extension (.pdf) not just file.type
//    because some browsers/OS return "application/octet-stream" for PDFs
// 2. MM tolerance bumped from 1 → 2 to handle floating point drift from PDF exporters
// 3. MM/inch conversion uses Math.round(...*100)/100 to reduce float noise before compare
// 4. getDimsInPx() is now ONLY used for IMAGE validation (not as a gate for PDF)
//    PDF validation runs independently whenever file looks like a PDF
// 5. Extension check is now case-insensitive (.CDR .PDF .PNG etc all work)
// 6. imageDimensions null/empty guard — if no dimensions set, ALL file types pass through
// 7. Legacy string dimensions (old products) still work for both image and PDF
// 8. CDR files always skip dimension check (no way to read CDR dimensions in browser)
// 9. All paths (image/pdf/cdr/other) produce clear toast messages with correct unit display

import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";

// ── PDF.js loader ────────────────────────────────────────────────────────────
const loadPdfJs = async () => {
  if (typeof window === "undefined") return null;
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
};

// ── Get raw dimension VALUES string (no unit label) ──────────────────────────
// Input: "210x297" | { unit:"mm", values:"210x297" } | null
// Output: "210x297" | ""
const getRawDimValues = (dim) => {
  if (!dim) return "";
  if (typeof dim === "string") return dim;
  if (typeof dim === "object") return dim.values || "";
  return "";
};

// ── Format dimension for USER DISPLAY with correct unit label ────────────────
// Input: "210x297" | { unit:"mm", values:"210x297" }
// Output: "210x297 mm" | "1280x760 px" | "3.78x2.28 inch"
const formatDimForDisplay = (dim) => {
  if (!dim) return "";
  if (typeof dim === "string") return dim; // legacy — show as-is (no unit suffix known)

  if (typeof dim === "object") {
    const values = (dim.values || "").trim();
    const unit = dim.unit || "px";
    if (!values) return "";
    const unitLabel = unit === "inch" ? "inch" : unit === "mm" ? "mm" : "px";
    return `${values} ${unitLabel}`;
  }
  return "";
};

// ── Check if a file is a PDF by extension OR mime type ───────────────────────
// Some browsers return "application/octet-stream" for PDFs — so we also check ext
const isPdfFile = (file) => {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return file.type === "application/pdf" || ext === "pdf";
};

// ── Check if a file is a CDR by extension ───────────────────────────────────
const isCdrFile = (file) => {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return ext === "cdr";
};

// ── Normalize dimension string (handle × unicode, spaces, uppercase) ─────────
const normalizeDimString = (s) => {
  if (!s) return "";
  return String(s)
    .replace(/\u00D7/gi, "x") // Unicode × → x
    .replace(/\s+/g, "")
    .toLowerCase();
};

// ── Parse "210x297,96x58" → [{w:210, h:297}, {w:96, h:58}] ──────────────────
const parseAllowedDims = (dimStr) => {
  const norm = normalizeDimString(dimStr || "");
  if (!norm) return [];
  return norm
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const parts = p.split("x");
      if (parts.length < 2) return null;
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      if (isNaN(w) || isNaN(h)) return null;
      return { w, h };
    })
    .filter(Boolean);
};

// ── Constants ────────────────────────────────────────────────────────────────
const PRINT_DPI = 300; // used for image px conversion from inch/mm

export default function ProductFileUpload({
  product,
  selectedFiles = [],
  setSelectedFiles,
  setFiles,
  uploadFiles,
  onUploadUrl,

  // Attribute mode props
  attributeName = null,
  attributeKey = null,
  uploadedAttrFiles = {},
  setUploadedAttrFiles = null,
  acceptTypes = null,   // array like ['png','jpg','pdf','cdr']
  maxSizeMB = null,
  imageDimensions = null, // string (legacy) OR { unit: "px"|"mm"|"inch", values: "WxH" }
  singleFile = false,
}) {
  const [openPanel, setOpenPanel] = useState(false);
  const fileInputRef = useRef(null);

  // ── Derived dimension values ─────────────────────────────────────────────
  const rawDimValues = getRawDimValues(imageDimensions);       // "210x297"
  const displayDimensions = formatDimForDisplay(imageDimensions); // "210x297 mm"
  const dimUnit = (imageDimensions && typeof imageDimensions === "object")
    ? (imageDimensions.unit || "px")
    : "px"; // unit string: "px" | "mm" | "inch"

  const hasDimensionRule = rawDimValues.trim().length > 0;

  // ── Parse allowed dims in their NATIVE unit (not converted to px) ────────
  // These are used directly for PDF validation (PDF.js gives us points → we convert to same unit)
  // and for image validation after converting to px
  const allowedDimsNative = parseAllowedDims(rawDimValues); // [{w,h}] in native unit

  // ── For IMAGE validation: convert native dims → px ───────────────────────
  const getAllowedDimsInPx = () => {
    if (!allowedDimsNative.length) return [];
    if (dimUnit === "inch") {
      return allowedDimsNative.map((d) => ({
        w: Math.round(d.w * PRINT_DPI),
        h: Math.round(d.h * PRINT_DPI),
      }));
    }
    if (dimUnit === "mm") {
      return allowedDimsNative.map((d) => ({
        w: Math.round((d.w / 25.4) * PRINT_DPI),
        h: Math.round((d.h / 25.4) * PRINT_DPI),
      }));
    }
    // px — already in px
    return allowedDimsNative;
  };

  // ── Accept file after all validations pass ───────────────────────────────
  const acceptFile = (file) => {
    if (!attributeKey || !setUploadedAttrFiles) return;
    setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
    toast.success(`File accepted for ${attributeName || attributeKey}`);
  };

  // ── Legacy multi-file (non-attribute mode) ───────────────────────────────
  const handlePickedFilesLegacy = (fileList) => {
    const arr = Array.from(fileList);
    setSelectedFiles && setSelectedFiles(arr);
    setFiles && setFiles(arr);
  };

  // ── PDF page size via PDF.js — returns points (1 point = 1/72 inch) ──────
  const getPdfPageSizePts = async (file) => {
    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) return null;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      return { w: viewport.width, h: viewport.height }; // in PDF points
    } catch (err) {
      console.error("PDF.js read error:", err);
      return null;
    }
  };

  // ── Convert PDF points to the admin's chosen unit ─────────────────────────
  // PDF.js gives points (1pt = 1/72 inch).
  // We convert to whatever unit admin set so comparison is apples-to-apples.
  const pdfPtsToUnit = (pts, unit) => {
    if (unit === "inch") {
      // round to 2 decimal places to reduce float noise
      return Math.round((pts / 72) * 100) / 100;
    }
    if (unit === "mm") {
      // round to 2 decimal places
      return Math.round((pts / 72) * 25.4 * 100) / 100;
    }
    // px — PDF.js points at scale:1 are roughly equivalent to CSS pixels at 72dpi
    return Math.round(pts);
  };

  // ── Tolerance per unit ───────────────────────────────────────────────────
  // mm: 2mm tolerance handles floating point drift from different PDF exporters
  // inch: 0.1 inch (~7px at 72dpi) — enough for rounding without being too loose
  // px: 2px — same as before
  const getToleranceForUnit = (unit) => {
    if (unit === "mm") return 2;
    if (unit === "inch") return 0.1;
    return 2; // px
  };

  // ── MAIN FILE HANDLER ────────────────────────────────────────────────────
  const handlePickedFileForAttribute = async (file) => {
    if (!attributeKey || !setUploadedAttrFiles) return;

    // 1) Extension check — case-insensitive
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (acceptTypes && acceptTypes.length) {
      const allowed = acceptTypes.map((x) => x.toLowerCase().replace(/^\./, ""));
      if (!allowed.includes(ext)) {
        toast.error(`Invalid file type. Allowed: ${acceptTypes.join(", ")}`);
        return;
      }
    }

    // 2) File size check
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB} MB allowed.`);
      return;
    }

    // 3) If NO dimension rule is set — accept everything immediately
    if (!hasDimensionRule) {
      acceptFile(file);
      return;
    }

    // 4) CDR — browser cannot read CDR dimensions, skip dimension check
    if (isCdrFile(file)) {
      acceptFile(file);
      return;
    }

    // 5) IMAGE dimension validation
    if (file.type.startsWith("image/")) {
      const dimsInPx = getAllowedDimsInPx();
      if (!dimsInPx.length) {
        // dimensions configured but couldn't parse — let it through
        acceptFile(file);
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const tolerance = getToleranceForUnit("px"); // image pixels always compared in px
        const match = dimsInPx.some(
          (d) => Math.abs(d.w - img.width) <= tolerance && Math.abs(d.h - img.height) <= tolerance
        );
        if (!match) {
          toast.error(`Invalid image size. Your file: ${img.width}x${img.height} px. Allowed: ${displayDimensions}`);
          return;
        }
        acceptFile(file);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error("Could not read image dimensions. Please try another file.");
      };
      img.src = url;
      return;
    }

    // 6) PDF dimension validation
    //    Check by extension OR mime type (handles browser MIME inconsistencies)
    if (isPdfFile(file)) {
      if (!allowedDimsNative.length) {
        acceptFile(file);
        return;
      }

      toast.loading("Reading PDF dimensions...", { id: "pdf-reading" });
      const pdfSize = await getPdfPageSizePts(file);
      toast.dismiss("pdf-reading");

      if (!pdfSize) {
        // PDF.js couldn't read it — accept with warning rather than blocking user
        toast.success(`File attached for ${attributeName || attributeKey} (PDF size unreadable — accepted)`);
        setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
        return;
      }

      // Convert PDF points → admin's chosen unit
      const fileW = pdfPtsToUnit(pdfSize.w, dimUnit);
      const fileH = pdfPtsToUnit(pdfSize.h, dimUnit);
      const tolerance = getToleranceForUnit(dimUnit);

      const match = allowedDimsNative.some(
        (d) => Math.abs(d.w - fileW) <= tolerance && Math.abs(d.h - fileH) <= tolerance
      );

      if (!match) {
        toast.error(
          `Invalid PDF size. Your file: ${fileW}x${fileH} ${dimUnit}. Allowed: ${displayDimensions}`
        );
        return;
      }

      acceptFile(file);
      return;
    }

    // 7) Any other file type (zip, ai, eps, etc.) — no dimension check possible
    acceptFile(file);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;
    if (attributeKey && setUploadedAttrFiles) {
      handlePickedFileForAttribute(files[0]);
    } else {
      handlePickedFilesLegacy(files);
    }
  };
  const onDragOver = (e) => e.preventDefault();

  // ── Remove handlers ──────────────────────────────────────────────────────
  const removeLegacyFileAtIndex = (idx) => {
    const arr = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles && setSelectedFiles(arr);
    setFiles && setFiles(arr);
  };

  const removeAttributeFile = () => {
    if (!setUploadedAttrFiles || !attributeKey) return;
    setUploadedAttrFiles((prev) => {
      const c = { ...prev };
      delete c[attributeKey];
      return c;
    });
    toast.success(`Removed file for ${attributeName || attributeKey}`);
  };

  const onInputChange = (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    if (attributeKey && setUploadedAttrFiles) {
      handlePickedFileForAttribute(files[0]);
    } else {
      handlePickedFilesLegacy(files);
    }
  };

  // ── Build <input accept="..."> attribute ─────────────────────────────────
  // CDR has no standard MIME — use extension. All others use MIME where possible.
  const buildAcceptAttr = () => {
    if (!acceptTypes || !acceptTypes.length) return undefined;
    return acceptTypes
      .map((t) => {
        const ext = t.toLowerCase().replace(/^\./, "");
        if (ext === "cdr") return ".cdr";
        if (ext === "ai") return ".ai";
        if (ext === "eps") return ".eps";
        if (ext === "pdf") return "application/pdf";
        if (ext === "png") return "image/png";
        if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
        if (ext === "gif") return "image/gif";
        if (ext === "webp") return "image/webp";
        if (ext === "svg") return "image/svg+xml";
        if (ext === "mp4") return "video/mp4";
        return `.${ext}`; // fallback
      })
      .join(",");
  };

  const openPicker = () => fileInputRef.current?.click();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`ops-file-uploader ${openPanel ? "expanded" : ""}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={attributeKey ? `attrFile_${attributeKey}` : "b2bFileUpload"}
        type="file"
        multiple={!attributeKey && !singleFile}
        accept={buildAcceptAttr()}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {/* Closed state — just the trigger button */}
      {!openPanel ? (
        <button
          className="ops-upload-primary"
          onClick={() => setOpenPanel(true)}
          type="button"
        >
          <img src="/assets/images/icons/upload.svg" alt="upload" />
          {attributeName || "Upload Your Design"}
        </button>
      ) : (
        /* Open panel */
        <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="ops-panel-inner">

            {/* Attribute info header */}
            {attributeName && (
              <div style={{ marginBottom: 10, textAlign: "left" }}>
                <h4 style={{ margin: 0 }}>{attributeName}</h4>
                {displayDimensions && (
                  <p style={{ fontSize: 13, margin: "4px 0", color: "#555" }}>
                    <strong>Required Size:</strong> {displayDimensions}
                  </p>
                )}
                <p style={{ fontSize: 13, margin: "2px 0", color: "#555" }}>
                  <strong>Accept:</strong> {acceptTypes?.join(", ") || "Any"}
                  {maxSizeMB && <> &bull; Max {maxSizeMB}MB</>}
                </p>
              </div>
            )}

            {/* Drag & drop zone */}
            <div className="ops-dnd">
              <div className="ops-dnd-inner">
                <img
                  src="/assets/images/icons/file.svg"
                  className="ops-dnd-illustration"
                  alt="file"
                />
                <h4>{attributeName || "Drag and drop your files"}</h4>
                <p className="ops-dnd-sub">
                  {acceptTypes?.length
                    ? `Accept: ${acceptTypes.join(", ")}${maxSizeMB ? `, max ${maxSizeMB}MB` : ""}`
                    : "JPEG, PNG, PDF, CDR, and more, up to 50MB"}
                </p>
                {displayDimensions && (
                  <p className="ops-dnd-sub" style={{ color: "#e07b00", fontWeight: 600 }}>
                    Required size: {displayDimensions}
                  </p>
                )}
                <button type="button" className="ops-dnd-select" onClick={openPicker}>
                  Select File
                </button>
                {attributeKey && uploadedAttrFiles?.[attributeKey] ? (
                  <p className="ops-dnd-note">
                    1 file selected for {attributeName || attributeKey}
                  </p>
                ) : selectedFiles.length > 0 ? (
                  <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
                ) : null}
              </div>
            </div>

            {/* File list */}
            <div className="ops-uploaded-files">
              <h5>Uploaded Files</h5>

              {attributeKey ? (
                !uploadedAttrFiles?.[attributeKey] ? (
                  <div className="ops-no-files">No file selected</div>
                ) : (
                  <div className="ops-file-row">
                    <div className="ops-file-left">
                      <img
                        src="/assets/images/icons/file.svg"
                        className="ops-file-icon"
                        alt="file"
                      />
                      <div className="ops-file-meta">
                        <div className="ops-file-name">
                          {uploadedAttrFiles[attributeKey].name}
                        </div>
                        <div className="ops-file-sub">
                          {(uploadedAttrFiles[attributeKey].size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      className="ops-file-remove"
                      onClick={removeAttributeFile}
                      type="button"
                    >
                      <img src="/assets/images/icons/trash.svg" alt="remove" />
                    </button>
                  </div>
                )
              ) : (
                <>
                  {selectedFiles.length === 0 ? (
                    <div className="ops-no-files">No files selected</div>
                  ) : (
                    selectedFiles.map((file, idx) => (
                      <div className="ops-file-row" key={idx}>
                        <div className="ops-file-left">
                          <img
                            src="/assets/images/icons/file.svg"
                            className="ops-file-icon"
                            alt="file"
                          />
                          <div className="ops-file-meta">
                            <div className="ops-file-name">{file.name}</div>
                            <div className="ops-file-sub">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ops-file-remove"
                          onClick={() => removeLegacyFileAtIndex(idx)}
                        >
                          <img src="/assets/images/icons/trash.svg" alt="remove" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="ops-panel-actions">
              <button
                className="ops-btn-cancel"
                onClick={() => setOpenPanel(false)}
                type="button"
              >
                Cancel
              </button>

              {!attributeKey && (
                <button
                  className="ops-btn-primary"
                  disabled={selectedFiles.length === 0}
                  onClick={async () => {
                    if (uploadFiles) await uploadFiles();
                    setOpenPanel(false);
                  }}
                >
                  Attach File
                </button>
              )}

              {attributeKey && (
                <button
                  className="ops-btn-primary"
                  disabled={!uploadedAttrFiles?.[attributeKey]}
                  onClick={() => setOpenPanel(false)}
                >
                  Attach File
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




















// // components/ProductFileUpload.jsx


// import React, { useState, useRef } from "react";
// import { toast } from "react-hot-toast";

// const loadPdfJs = async () => {
//   if (typeof window === "undefined") return null;
//   const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
//   return pdfjsLib;
// };

// // ── Helper: get raw dimension string (values only, no unit) ──────────────────
// const getRawDimValues = (dim) => {
//   if (!dim) return "";
//   if (typeof dim === "string") return dim;
//   if (typeof dim === "object") return dim.values || "";
//   return "";
// };

// // ── Helper: format dimension for DISPLAY with correct unit label ─────────────
// // FIX: was showing "1280x760 px" even when admin saved as inch
// const formatDimForDisplay = (dim) => {
//   if (!dim) return "";
//   if (typeof dim === "string") return dim; // legacy string — show as-is

//   if (typeof dim === "object") {
//     const values = dim.values || "";
//     const unit = dim.unit || "px";
//     if (!values) return "";

//     // unit label mapping
//     const unitLabel = unit === "inch" ? "inch" : unit === "mm" ? "mm" : "px";
//     return `${values} ${unitLabel}`;
//   }
//   return "";
// };

// export default function ProductFileUpload({
//   product,
//   selectedFiles = [],
//   setSelectedFiles,
//   setFiles,
//   uploadFiles,
//   onUploadUrl,

//   // Attribute mode props
//   attributeName = null,
//   attributeKey = null,
//   uploadedAttrFiles = {},
//   setUploadedAttrFiles = null,
//   acceptTypes = null,   // array like ['png','jpg','pdf','cdr']
//   maxSizeMB = null,
//   imageDimensions = null, // can be string (legacy) or {unit, values} (new)
//   singleFile = false,
// }) {
//   const [openPanel, setOpenPanel] = useState(false);
//   const [urlValue, setUrlValue] = useState("");
//   const fileInputRef = useRef(null);

//   // Raw dimension string (values only, used for parsing px comparisons)
//   const normalizedImageDimensions = getRawDimValues(imageDimensions);

//   // Display string with correct unit label — FIX for showing inch/mm correctly
//   const displayDimensions = formatDimForDisplay(imageDimensions);

//   const DPI = 300;
//   const inchToPx = (inch) => Math.round(inch * DPI);
//   const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);

//   // ── parse "1280x760,210x297" → [{w,h}, ...]  ────────────────────────────
//   const normalizeDimString = (s) => {
//     if (!s) return "";
//     return String(s).replace(/\u00D7/g, "x").replace(/\s+/g, "").toLowerCase();
//   };

//   const parseAllowedDims = (dimStr) => {
//     const norm = normalizeDimString(dimStr || "");
//     if (!norm) return [];
//     return norm
//       .split(",")
//       .map((p) => p.trim())
//       .filter(Boolean)
//       .map((p) => {
//         const [w, h] = p.split("x").map(Number);
//         if (!isNaN(w) && !isNaN(h)) return { w, h };
//         return null;
//       })
//       .filter(Boolean);
//   };

//   // Parse allowed dimensions — for IMAGE validation only (px comparison)
//   // For PDF we handle conversion separately in the PDF validation block
//   const getDimsInPx = () => {
//     let dims = parseAllowedDims(normalizedImageDimensions);
//     if (!dims.length) return [];

//     if (imageDimensions && typeof imageDimensions === "object") {
//       if (imageDimensions.unit === "inch") {
//         dims = dims.map((d) => ({ w: inchToPx(d.w), h: inchToPx(d.h) }));
//       } else if (imageDimensions.unit === "mm") {
//         dims = dims.map((d) => ({ w: mmToPx(d.w), h: mmToPx(d.h) }));
//       }
//       // px — dims are already the right numbers, no conversion
//     }
//     return dims;
//   };

//   // ── legacy multi-file ────────────────────────────────────────────────────
//   const handlePickedFilesLegacy = (fileList) => {
//     const arr = Array.from(fileList);
//     setSelectedFiles && setSelectedFiles(arr);
//     setFiles && setFiles(arr);
//   };

//   // ── PDF page size — returns points (PDF native unit from PDF.js) ────────────
//   // PDF.js viewport at scale:1 gives dimensions in "points" (1pt = 1/72 inch).
//   // Caller converts to the right unit depending on what admin configured:
//   //   px   → points are used directly (screen PDF: 1pt ≈ 1px at 72dpi)
//   //   inch → points / 72 = inches
//   //   mm   → points / 72 * 25.4 = mm
//   const getPdfPageSizePts = async (file) => {
//     const pdfjsLib = await loadPdfJs();
//     if (!pdfjsLib) return null;
//     const arrayBuffer = await file.arrayBuffer();
//     const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
//     const page = await pdf.getPage(1);
//     const viewport = page.getViewport({ scale: 1 });
//     return {
//       w: viewport.width,   // points
//       h: viewport.height,  // points
//     };
//   };

//   // ── main attribute file handler ──────────────────────────────────────────
//   const handlePickedFileForAttribute = (file) => {
//     if (!attributeKey || !setUploadedAttrFiles) return;

//     const ext = (file.name.split(".").pop() || "").toLowerCase();

//     // 1) Extension validation
//     if (acceptTypes && acceptTypes.length) {
//       const allowed = acceptTypes.map((x) => x.toLowerCase().replace(/^\./, ""));
//       if (!allowed.includes(ext)) {
//         toast.error(`Invalid file type. Allowed: ${acceptTypes.join(", ")}`);
//         return;
//       }
//     }

//     // 2) Size validation
//     if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
//       toast.error(`File too large. Max ${maxSizeMB} MB allowed.`);
//       return;
//     }

//     const dims = getDimsInPx();

//     // 3a) IMAGE dimension validation
//     if (dims.length > 0 && file.type.startsWith("image/")) {
//       const img = new Image();
//       const url = URL.createObjectURL(file);
//       img.onload = () => {
//         URL.revokeObjectURL(url);
//         const match = dims.some((d) => d.w === img.width && d.h === img.height);
//         if (!match) {
//           toast.error(
//             `Invalid image size. Allowed: ${displayDimensions}`
//           );
//           return;
//         }
//         setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//         toast.success(`File accepted for ${attributeName}`);
//       };
//       img.src = url;
//       return;
//     }

//     // 3b) PDF dimension validation
//     if (dims.length > 0 && file.type === "application/pdf") {
//       getPdfPageSizePts(file).then(({ w: ptsW, h: ptsH }) => {
//         // Convert PDF points to the same unit admin used when setting dimensions
//         // so comparison is apples-to-apples
//         const unit = (imageDimensions && typeof imageDimensions === "object")
//           ? imageDimensions.unit || "px"
//           : "px";

//         let fileW, fileH;
//         if (unit === "px") {
//           // Screen PDF: PDF.js points ≈ pixels at 72dpi (1pt = 1px for screen PDFs)
//           // Use points directly — this matches what admin typed as px
//           fileW = Math.round(ptsW);
//           fileH = Math.round(ptsH);
//         } else if (unit === "inch") {
//           // Convert points → inches (1 inch = 72 points)
//           fileW = ptsW / 72;
//           fileH = ptsH / 72;
//         } else if (unit === "mm") {
//           // Convert points → mm (1 inch = 25.4mm, 1 inch = 72 points)
//           fileW = (ptsW / 72) * 25.4;
//           fileH = (ptsH / 72) * 25.4;
//         }

//         // Tolerance: 2px for px, 0.5 for inch, 1 for mm
//         const TOLERANCE = unit === "px" ? 2 : unit === "inch" ? 0.5 : 1;

//         const match = dims.some(
//           (d) => Math.abs(d.w - fileW) <= TOLERANCE && Math.abs(d.h - fileH) <= TOLERANCE
//         );

//         if (!match) {
//           toast.error(`Invalid PDF size. Allowed: ${displayDimensions}`);
//           return;
//         }
//         setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//         toast.success(`PDF accepted for ${attributeName}`);
//       });
//       return;
//     }

//     // 3c) CDR / other files — no dimension check possible, accept immediately
//     setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//     toast.success(`File attached for ${attributeName || attributeKey}`);
//   };

//   // ── drag/drop ────────────────────────────────────────────────────────────
//   const onDrop = (e) => {
//     e.preventDefault();
//     const files = e.dataTransfer?.files;
//     if (!files || !files.length) return;
//     if (attributeKey && setUploadedAttrFiles) {
//       handlePickedFileForAttribute(files[0]);
//     } else {
//       handlePickedFilesLegacy(files);
//     }
//   };

//   const onDragOver = (e) => e.preventDefault();
//   const openPicker = () => fileInputRef.current?.click();

//   // ── remove handlers ──────────────────────────────────────────────────────
//   const removeLegacyFileAtIndex = (idx) => {
//     const arr = selectedFiles.filter((_, i) => i !== idx);
//     setSelectedFiles && setSelectedFiles(arr);
//     setFiles && setFiles(arr);
//   };

//   const removeAttributeFile = () => {
//     if (!setUploadedAttrFiles || !attributeKey) return;
//     setUploadedAttrFiles((prev) => {
//       const c = { ...prev };
//       delete c[attributeKey];
//       return c;
//     });
//     toast.success(`Removed file for ${attributeName || attributeKey}`);
//   };

//   const onInputChange = (e) => {
//     const files = e.target.files;
//     if (!files || !files.length) return;
//     if (attributeKey && setUploadedAttrFiles) {
//       handlePickedFileForAttribute(files[0]);
//     } else {
//       handlePickedFilesLegacy(files);
//     }
//   };

//   // ── build accept string for <input type="file"> ──────────────────────────
//   // FIX: CDR is not a standard MIME type — use .cdr extension directly
//   const buildAcceptAttr = () => {
//     if (!acceptTypes || !acceptTypes.length) return undefined;
//     return acceptTypes
//       .map((t) => {
//         const ext = t.toLowerCase().replace(/^\./, "");
//         if (ext === "cdr") return ".cdr";
//         if (ext === "pdf") return "application/pdf";
//         if (ext === "png") return "image/png";
//         if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
//         if (ext === "gif") return "image/gif";
//         if (ext === "webp") return "image/webp";
//         if (ext === "mp4") return "video/mp4";
//         return `.${ext}`; // fallback — use extension
//       })
//       .join(",");
//   };

//   return (
//     <div className={`ops-file-uploader ${openPanel ? "expanded" : ""}`}>
//       {/* hidden file input */}
//       <input
//         ref={fileInputRef}
//         id={attributeKey ? `attrFile_${attributeKey}` : "b2bFileUpload"}
//         type="file"
//         multiple={!attributeKey && !singleFile}
//         accept={buildAcceptAttr()}
//         style={{ display: "none" }}
//         onChange={onInputChange}
//       />

//       {/* closed state */}
//       {!openPanel ? (
//         <button
//           className="ops-upload-primary"
//           onClick={() => setOpenPanel(true)}
//           type="button"
//         >
//           <img src="/assets/images/icons/upload.svg" alt="upload" />
//           {attributeName || "Upload Your Design"}
//         </button>
//       ) : (
//         <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
//           <div className="ops-panel-inner">

//             {/* Attribute header */}
//             {attributeName && (
//               <div style={{ marginBottom: 10, textAlign: "left" }}>
//                 <h4 style={{ margin: 0 }}>{attributeName}</h4>
//                 {/* FIX: show displayDimensions (has correct unit) not raw px string */}
//                 {displayDimensions && (
//                   <p style={{ fontSize: 13, margin: "4px 0", color: "#555" }}>
//                     <strong>Required Size:</strong> {displayDimensions}
//                   </p>
//                 )}
//                 <p style={{ fontSize: 13, margin: "2px 0", color: "#555" }}>
//                   <strong>Accept:</strong> {acceptTypes?.join(", ") || "Any"}{" "}
//                   {maxSizeMB && <>• Max {maxSizeMB}MB</>}
//                 </p>
//               </div>
//             )}

//             {/* drag area */}
//             <div className="ops-dnd">
//               <div className="ops-dnd-inner">
//                 <img src="/assets/images/icons/file.svg" className="ops-dnd-illustration" alt="file" />
//                 <h4>{attributeName || "Drag and drop your files"}</h4>
//                 <p className="ops-dnd-sub">
//                   {acceptTypes?.length
//                     ? `Accept: ${acceptTypes.join(", ")}${maxSizeMB ? `, max ${maxSizeMB}MB` : ""}`
//                     : "JPEG, PNG, PDF, CDR, and more, up to 50MB"}
//                 </p>
//                 <button type="button" className="ops-dnd-select" onClick={openPicker}>
//                   Select File
//                 </button>
//                 {attributeKey && uploadedAttrFiles?.[attributeKey] ? (
//                   <p className="ops-dnd-note">1 file selected for {attributeName || attributeKey}</p>
//                 ) : selectedFiles.length > 0 ? (
//                   <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
//                 ) : null}
//               </div>
//             </div>

//             {/* file list */}
//             <div className="ops-uploaded-files">
//               <h5>Uploaded Files</h5>

//               {attributeKey ? (
//                 !uploadedAttrFiles?.[attributeKey] ? (
//                   <div className="ops-no-files">No file selected</div>
//                 ) : (
//                   <div className="ops-file-row">
//                     <div className="ops-file-left">
//                       <img src="/assets/images/icons/file.svg" className="ops-file-icon" alt="file" />
//                       <div className="ops-file-meta">
//                         <div className="ops-file-name">{uploadedAttrFiles[attributeKey].name}</div>
//                         <div className="ops-file-sub">
//                           {(uploadedAttrFiles[attributeKey].size / 1024).toFixed(1)} KB
//                         </div>
//                       </div>
//                     </div>
//                     <button className="ops-file-remove" onClick={removeAttributeFile} type="button">
//                       <img src="/assets/images/icons/trash.svg" alt="remove" />
//                     </button>
//                   </div>
//                 )
//               ) : (
//                 <>
//                   {selectedFiles.length === 0 ? (
//                     <div className="ops-no-files">No files selected</div>
//                   ) : (
//                     selectedFiles.map((file, idx) => (
//                       <div className="ops-file-row" key={idx}>
//                         <div className="ops-file-left">
//                           <img src="/assets/images/icons/file.svg" className="ops-file-icon" alt="file" />
//                           <div className="ops-file-meta">
//                             <div className="ops-file-name">{file.name}</div>
//                             <div className="ops-file-sub">{(file.size / 1024).toFixed(1)} KB</div>
//                           </div>
//                         </div>
//                         <button type="button" className="ops-file-remove" onClick={() => removeLegacyFileAtIndex(idx)}>
//                           <img src="/assets/images/icons/trash.svg" alt="remove" />
//                         </button>
//                       </div>
//                     ))
//                   )}
//                 </>
//               )}
//             </div>

//             {/* actions */}
//             <div className="ops-panel-actions">
//               <button className="ops-btn-cancel" onClick={() => setOpenPanel(false)} type="button">
//                 Cancel
//               </button>
//               {!attributeKey && (
//                 <button
//                   className="ops-btn-primary"
//                   disabled={selectedFiles.length === 0}
//                   onClick={async () => {
//                     if (uploadFiles) await uploadFiles();
//                     setOpenPanel(false);
//                   }}
//                 >
//                   Attach File
//                 </button>
//               )}
//               {attributeKey && (
//                 <button
//                   className="ops-btn-primary"
//                   disabled={!uploadedAttrFiles?.[attributeKey]}
//                   onClick={() => setOpenPanel(false)}
//                 >
//                   Attach File
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// // components/ProductFileUpload.jsx
// import React, { useState, useRef } from "react";
// import { toast } from "react-hot-toast";


// const loadPdfJs = async () => {
//   if (typeof window === "undefined") return null;

//   const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

//   // 👇 IMPORTANT: use local worker from /public
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

//   return pdfjsLib;
// };


// export default function ProductFileUpload({

  
//   product,
//   selectedFiles = [],
//   setSelectedFiles,
//   setFiles,
//   uploadFiles,
//   onUploadUrl,

//   // Attribute mode props
//   attributeName = null,
//   attributeKey = null,
//   uploadedAttrFiles = {},
//   setUploadedAttrFiles = null,
//   acceptTypes = null, // array like ['png','jpg','pdf']
//   maxSizeMB = null, // number
//   // normalizedImageDimensions = null, // string e.g. "1280x760,760x540" or "1280 x 760"
//   imageDimensions = null,

//   singleFile = false,
// }) {
//   const [openPanel, setOpenPanel] = useState(false);
//   const [urlValue, setUrlValue] = useState("");
//   const fileInputRef = useRef(null);

// const getNormalizedImageDimensions = (dim) => {
//   if (!dim) return "";

//   // Old products
//   if (typeof dim === "string") return dim;

//   // New products
//   if (typeof dim === "object") return dim.values || "";

//   return "";
// };

// const normalizedImageDimensions = getNormalizedImageDimensions(imageDimensions);



//   // ---------------- helpers ----------------
//   const normalizeDimString = (s) => {
//     if (s === null || s === undefined) return "";
//     return String(s)
//       .replace(/\u00D7/g, "x") // × -> x
//       .replace(/\s+/g, "") // remove spaces
//       .toLowerCase();
//   };

//   const parseAllowedDims = (dimStr) => {
//     const norm = normalizeDimString(dimStr || "");
//     if (!norm) return [];
//     return norm
//       .split(",")
//       .map((p) => p.trim())
//       .filter(Boolean)
//       .map((p) => {
//         const [w, h] = p.split("x").map((n) => Number(n));
//         if (!isNaN(w) && !isNaN(h)) return { w, h };
//         return null;
//       })
//       .filter(Boolean);
//   };

//   // -------- legacy multi-file handler --------
//   const handlePickedFilesLegacy = (fileList) => {
//     const arr = Array.from(fileList);
//     setSelectedFiles && setSelectedFiles(arr);
//     setFiles && setFiles(arr);
//   };


//   const DPI = 300; // standard print DPI

// const inchToPx = (inch) => Math.round(inch * DPI);
// const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);



// const getPdfPageSizePx = async (file) => {
//   const pdfjsLib = await loadPdfJs();
//   if (!pdfjsLib) return null;

//   const arrayBuffer = await file.arrayBuffer();

//   const pdf = await pdfjsLib.getDocument({
//     data: arrayBuffer,
//   }).promise;

//   const page = await pdf.getPage(1);
//   const viewport = page.getViewport({ scale: 1 });

//   const DPI = 300;

//   return {
//     w: Math.round((viewport.width / 72) * DPI),
//     h: Math.round((viewport.height / 72) * DPI),
//   };
// };






//   // -------- attribute single-file handler (robust) --------
//   const handlePickedFileForAttribute = (file) => {
//     if (!attributeKey || !setUploadedAttrFiles) return;

//     // 1) validate extension
//     if (acceptTypes && acceptTypes.length) {
//       const ext = (file.name.split(".").pop() || "").toLowerCase();
//       if (!acceptTypes.map((x) => x.toLowerCase()).includes(ext)) {
//         toast.error(`Invalid file type. Allowed: ${acceptTypes.join(", ")}`);
//         return;
//       }
//     }

//     // 2) validate size
//     if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
//       toast.error(`File too large. Max ${maxSizeMB} MB allowed.`);
//       return;
//     }

//     // 3) validate image dimensions (if configured & file is image)
//     let dims = parseAllowedDims(normalizedImageDimensions);

// // 🔥 Convert to PX if unit is inch or mm
// if (imageDimensions && typeof imageDimensions === "object") {
//   if (imageDimensions.unit === "inch") {
//     dims = dims.map(d => ({
//       w: inchToPx(d.w),
//       h: inchToPx(d.h),
//     }));
//   }

//   if (imageDimensions.unit === "mm") {
//     dims = dims.map(d => ({
//       w: mmToPx(d.w),
//       h: mmToPx(d.h),
//     }));
//   }
// }

    
//     // IMAGE VALIDATION
// if (dims.length > 0 && file.type.startsWith("image/")) {
//   const img = new Image();
//   const url = URL.createObjectURL(file);

//   img.onload = () => {
//     URL.revokeObjectURL(url);

//     const match = dims.some(
//       (d) => d.w === img.width && d.h === img.height
//     );

//     if (!match) {
//       toast.error(
//         `Invalid image size. Allowed: ${dims
//           .map((d) => `${d.w}x${d.h}`)
//           .join(", ")}`
//       );
//       return;
//     }

//     setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//     toast.success(`File accepted for ${attributeName}`);
//   };

//   img.src = url;
//   return;
// }

// // 📄 PDF VALIDATION
// if (dims.length > 0 && file.type === "application/pdf") {
//   getPdfPageSizePx(file).then(({ w, h }) => {


//     // this one ihave change one 11-2-26



//     // const match = dims.some((d) => d.w === w && d.h === h);


//     const TOLERANCE = 3; // allow 3px difference

//     const match = dims.some(
//       (d) =>
//         Math.abs(d.w - w) <= TOLERANCE &&
//         Math.abs(d.h - h) <= TOLERANCE
//     );


//     if (!match) {
//       toast.error(
//         `Invalid PDF size. Allowed: ${dims
//           .map((d) => `${d.w}x${d.h}`)
//           .join(", ")}`
//       );
//       return;
//     }

//     setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//     toast.success(`PDF accepted for ${attributeName}`);
//   });

//   return;
// }


//     // not an image or no dims configured — accept immediately
//     setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//     toast.success(`File attached for ${attributeName || attributeKey}`);
//   };

//   // ---------------- drag/drop ----------------
//   const onDrop = (e) => {
//     e.preventDefault();
//     const files = e.dataTransfer?.files;
//     if (!files || !files.length) return;

//     if (attributeKey && setUploadedAttrFiles) {
//       handlePickedFileForAttribute(files[0]);
//     } else {
//       handlePickedFilesLegacy(files);
//     }
//   };

//   const openPicker = () => fileInputRef.current?.click();

//   const onDragOver = (e) => e.preventDefault();

//   // ---------------- remove handlers ----------------
//   const removeLegacyFileAtIndex = (idx) => {
//     const arr = selectedFiles.filter((_, i) => i !== idx);
//     setSelectedFiles && setSelectedFiles(arr);
//     setFiles && setFiles(arr);
//   };

//   const removeAttributeFile = () => {
//     if (!setUploadedAttrFiles || !attributeKey) return;
//     setUploadedAttrFiles((prev) => {
//       const c = { ...prev };
//       delete c[attributeKey];
//       return c;
//     });
//     toast.success(`Removed file for ${attributeName || attributeKey}`);
//   };

//   // ---------------- input change ----------------
//   const onInputChange = (e) => {
//     const files = e.target.files;
//     if (!files || !files.length) return;

//     if (attributeKey && setUploadedAttrFiles) {
//       handlePickedFileForAttribute(files[0]);
//     } else {
//       handlePickedFilesLegacy(files);
//     }
//   };

//   // ---------------- render ----------------


//   const normalizeImageDimensions = (dim) => {
//   if (!dim) return "";

//   // Old products (string)
//   if (typeof dim === "string") {
//     return dim;
//   }

//   // New products (object)
//   if (typeof dim === "object") {
//     return dim.values || "";
//   }

//   return "";
// };

//   return (
//     <div className={`ops-file-uploader ${openPanel ? "expanded" : ""}`}>
//       {/* hidden file input */}
//       <input
//         ref={fileInputRef}
//         id={attributeKey ? `attrFile_${attributeKey}` : "b2bFileUpload"}
//         type="file"
//         multiple={!attributeKey && !singleFile}
//         style={{ display: "none" }}
//         onChange={onInputChange}
//       />

//       {/* closed state */}
//       {!openPanel ? (
//         <button
//           className="ops-upload-primary"
//           onClick={() => setOpenPanel(true)}
//           type="button"
//         >
//           <img src="/assets/images/icons/upload.svg" />
//           {/* {attributeName ? `Upload ${attributeName}` : "Upload Your Design"} */}

//           {attributeName || "Upload Your Design"}

//         </button>
//       ) : (
//         <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
//           <div className="ops-panel-inner">
//             {/* Attribute header (if attribute mode) */}
//             {attributeName && (
//               <div style={{ marginBottom: 10, textAlign: "left" }}>
//                 <h4 style={{ margin: 0 }}>{attributeName}</h4>
//                 {normalizedImageDimensions && (
//                   <p style={{ fontSize: 13, margin: "4px 0", color: "#555" }}>
//                     <strong>Required Size:</strong> {normalizedImageDimensions}
//                   </p>
//                 )}
//                 <p style={{ fontSize: 13, margin: "2px 0", color: "#555" }}>
//                   <strong>Accept:</strong> {acceptTypes?.join(", ") || "Any"}{" "}
//                   {maxSizeMB && <>• Max {maxSizeMB}MB</>}
//                 </p>
//               </div>
//             )}

//             {/* drag area */}
//             <div className="ops-dnd">
//               <div className="ops-dnd-inner">
//                 <img
//                   src="/assets/images/icons/file.svg"
//                   className="ops-dnd-illustration"
//                 />
//                 <h4>{attributeName || "Drag and drop your files"}</h4>

//                 <p className="ops-dnd-sub">
//                   {acceptTypes?.length
//                     ? `Accept: ${acceptTypes.join(", ")}${maxSizeMB ? `, max ${maxSizeMB}MB` : ""}`
//                     : "JPEG, PNG, PDF, and MP4 formats, up to 50MB"}
//                 </p>

//                 <button type="button" className="ops-dnd-select" onClick={openPicker}>
//                   Select File
//                 </button>

//                 {attributeKey && uploadedAttrFiles?.[attributeKey] ? (
//                   <p className="ops-dnd-note">1 file selected for {attributeName || attributeKey}</p>
//                 ) : selectedFiles.length > 0 ? (
//                   <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
//                 ) : null}
//               </div>
//             </div>

//             {/* file list */}
//             <div className="ops-uploaded-files">
//               <h5>Uploaded Files</h5>

//               {/* attribute mode */}
//               {attributeKey ? (
//                 !uploadedAttrFiles?.[attributeKey] ? (
//                   <div className="ops-no-files">No file selected</div>
//                 ) : (
//                   <div className="ops-file-row">
//                     <div className="ops-file-left">
//                       <img src="/assets/images/icons/file.svg" className="ops-file-icon" />
//                       <div className="ops-file-meta">
//                         <div className="ops-file-name">
//                           {uploadedAttrFiles[attributeKey].name}
//                         </div>
//                         <div className="ops-file-sub">
//                           {(uploadedAttrFiles[attributeKey].size / 1024).toFixed(1)} KB
//                         </div>
//                       </div>
//                     </div>

//                     <button className="ops-file-remove" onClick={removeAttributeFile} type="button">
//                       <img src="/assets/images/icons/trash.svg" />
//                     </button>
//                   </div>
//                 )
//               ) : (
//                 // legacy mode
//                 <>
//                   {selectedFiles.length === 0 ? (
//                     <div className="ops-no-files">No files selected</div>
//                   ) : (
//                     selectedFiles.map((file, idx) => (
//                       <div className="ops-file-row" key={idx}>
//                         <div className="ops-file-left">
//                           <img src="/assets/images/icons/file.svg" className="ops-file-icon" />
//                           <div className="ops-file-meta">
//                             <div className="ops-file-name">{file.name}</div>
//                             <div className="ops-file-sub">
//                               {(file.size / 1024).toFixed(1)} KB
//                             </div>
//                           </div>
//                         </div>

//                         <button
//                           type="button"
//                           className="ops-file-remove"
//                           onClick={() => removeLegacyFileAtIndex(idx)}
//                         >
//                           <img src="/assets/images/icons/trash.svg" />
//                         </button>
//                       </div>
//                     ))
//                   )}
//                 </>
//               )}
//             </div>

//             {/* actions */}
//             <div className="ops-panel-actions">
//               <button className="ops-btn-cancel" onClick={() => setOpenPanel(false)} type="button">
//                 Cancel
//               </button>

//               {/* legacy attach */}
//               {!attributeKey && (
//                 <button
//                   className="ops-btn-primary"
//                   disabled={selectedFiles.length === 0}
//                   onClick={async () => {
//                     if (uploadFiles) await uploadFiles();
//                     setOpenPanel(false);
//                   }}
//                 >
//                   Attach File
//                 </button>
//               )}

//               {/* attribute attach (close only, parent state updated when validation passed) */}
//               {attributeKey && (
//                 <button
//                   className="ops-btn-primary"
//                   disabled={!uploadedAttrFiles?.[attributeKey]}
//                   onClick={() => setOpenPanel(false)}
//                 >
//                   Attach File
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


















