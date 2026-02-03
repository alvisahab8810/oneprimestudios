
// // components/ProductFileUpload.jsx
// import React, { useState, useRef } from "react";
// import { toast } from "react-hot-toast";


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

    
//     if (dims.length > 0 && file.type && file.type.startsWith("image/")) {
//       const img = new Image();
//       const url = URL.createObjectURL(file);
//       let settled = false;

//       img.onload = () => {
//         if (settled) return;
//         settled = true;
//         URL.revokeObjectURL(url);

//         const match = dims.some((d) => d.w === img.width && d.h === img.height);
//         if (!match) {
//           toast.error(
//             `Invalid image size. Allowed: ${dims
//               .map((d) => `${d.w}x${d.h}`)
//               .join(", ")}. Uploaded: ${img.width}x${img.height}`
//           );
//           return;
//         }

//         // passed validation — store under attributeKey
//         setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
//         toast.success(`File accepted for ${attributeName || attributeKey}`);
//       };

//       img.onerror = () => {
//         if (settled) return;
//         settled = true;
//         URL.revokeObjectURL(url);
//         toast.error("Unable to read image — upload a valid image file.");
//       };

//       img.src = url;
//       return; // wait for onload
//     }

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
















// components/ProductFileUpload.jsx
import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";


const loadPdfJs = async () => {
  if (typeof window === "undefined") return null;

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

  // 👇 IMPORTANT: use local worker from /public
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  return pdfjsLib;
};


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
  acceptTypes = null, // array like ['png','jpg','pdf']
  maxSizeMB = null, // number
  // normalizedImageDimensions = null, // string e.g. "1280x760,760x540" or "1280 x 760"
  imageDimensions = null,

  singleFile = false,
}) {
  const [openPanel, setOpenPanel] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef(null);

const getNormalizedImageDimensions = (dim) => {
  if (!dim) return "";

  // Old products
  if (typeof dim === "string") return dim;

  // New products
  if (typeof dim === "object") return dim.values || "";

  return "";
};

const normalizedImageDimensions = getNormalizedImageDimensions(imageDimensions);



  // ---------------- helpers ----------------
  const normalizeDimString = (s) => {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/\u00D7/g, "x") // × -> x
      .replace(/\s+/g, "") // remove spaces
      .toLowerCase();
  };

  const parseAllowedDims = (dimStr) => {
    const norm = normalizeDimString(dimStr || "");
    if (!norm) return [];
    return norm
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [w, h] = p.split("x").map((n) => Number(n));
        if (!isNaN(w) && !isNaN(h)) return { w, h };
        return null;
      })
      .filter(Boolean);
  };

  // -------- legacy multi-file handler --------
  const handlePickedFilesLegacy = (fileList) => {
    const arr = Array.from(fileList);
    setSelectedFiles && setSelectedFiles(arr);
    setFiles && setFiles(arr);
  };


  const DPI = 300; // standard print DPI

const inchToPx = (inch) => Math.round(inch * DPI);
const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);



const getPdfPageSizePx = async (file) => {
  const pdfjsLib = await loadPdfJs();
  if (!pdfjsLib) return null;

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  const DPI = 300;

  return {
    w: Math.round((viewport.width / 72) * DPI),
    h: Math.round((viewport.height / 72) * DPI),
  };
};






  // -------- attribute single-file handler (robust) --------
  const handlePickedFileForAttribute = (file) => {
    if (!attributeKey || !setUploadedAttrFiles) return;

    // 1) validate extension
    if (acceptTypes && acceptTypes.length) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!acceptTypes.map((x) => x.toLowerCase()).includes(ext)) {
        toast.error(`Invalid file type. Allowed: ${acceptTypes.join(", ")}`);
        return;
      }
    }

    // 2) validate size
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB} MB allowed.`);
      return;
    }

    // 3) validate image dimensions (if configured & file is image)
    let dims = parseAllowedDims(normalizedImageDimensions);

// 🔥 Convert to PX if unit is inch or mm
if (imageDimensions && typeof imageDimensions === "object") {
  if (imageDimensions.unit === "inch") {
    dims = dims.map(d => ({
      w: inchToPx(d.w),
      h: inchToPx(d.h),
    }));
  }

  if (imageDimensions.unit === "mm") {
    dims = dims.map(d => ({
      w: mmToPx(d.w),
      h: mmToPx(d.h),
    }));
  }
}

    
    // IMAGE VALIDATION
if (dims.length > 0 && file.type.startsWith("image/")) {
  const img = new Image();
  const url = URL.createObjectURL(file);

  img.onload = () => {
    URL.revokeObjectURL(url);

    const match = dims.some(
      (d) => d.w === img.width && d.h === img.height
    );

    if (!match) {
      toast.error(
        `Invalid image size. Allowed: ${dims
          .map((d) => `${d.w}x${d.h}`)
          .join(", ")}`
      );
      return;
    }

    setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
    toast.success(`File accepted for ${attributeName}`);
  };

  img.src = url;
  return;
}

// 📄 PDF VALIDATION
if (dims.length > 0 && file.type === "application/pdf") {
  getPdfPageSizePx(file).then(({ w, h }) => {
    const match = dims.some((d) => d.w === w && d.h === h);

    if (!match) {
      toast.error(
        `Invalid PDF size. Allowed: ${dims
          .map((d) => `${d.w}x${d.h}`)
          .join(", ")}`
      );
      return;
    }

    setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
    toast.success(`PDF accepted for ${attributeName}`);
  });

  return;
}


    // not an image or no dims configured — accept immediately
    setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
    toast.success(`File attached for ${attributeName || attributeKey}`);
  };

  // ---------------- drag/drop ----------------
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

  const openPicker = () => fileInputRef.current?.click();

  const onDragOver = (e) => e.preventDefault();

  // ---------------- remove handlers ----------------
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

  // ---------------- input change ----------------
  const onInputChange = (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    if (attributeKey && setUploadedAttrFiles) {
      handlePickedFileForAttribute(files[0]);
    } else {
      handlePickedFilesLegacy(files);
    }
  };

  // ---------------- render ----------------


  const normalizeImageDimensions = (dim) => {
  if (!dim) return "";

  // Old products (string)
  if (typeof dim === "string") {
    return dim;
  }

  // New products (object)
  if (typeof dim === "object") {
    return dim.values || "";
  }

  return "";
};

  return (
    <div className={`ops-file-uploader ${openPanel ? "expanded" : ""}`}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        id={attributeKey ? `attrFile_${attributeKey}` : "b2bFileUpload"}
        type="file"
        multiple={!attributeKey && !singleFile}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {/* closed state */}
      {!openPanel ? (
        <button
          className="ops-upload-primary"
          onClick={() => setOpenPanel(true)}
          type="button"
        >
          <img src="/assets/images/icons/upload.svg" />
          {/* {attributeName ? `Upload ${attributeName}` : "Upload Your Design"} */}

          {attributeName || "Upload Your Design"}

        </button>
      ) : (
        <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="ops-panel-inner">
            {/* Attribute header (if attribute mode) */}
            {attributeName && (
              <div style={{ marginBottom: 10, textAlign: "left" }}>
                <h4 style={{ margin: 0 }}>{attributeName}</h4>
                {normalizedImageDimensions && (
                  <p style={{ fontSize: 13, margin: "4px 0", color: "#555" }}>
                    <strong>Required Size:</strong> {normalizedImageDimensions}
                  </p>
                )}
                <p style={{ fontSize: 13, margin: "2px 0", color: "#555" }}>
                  <strong>Accept:</strong> {acceptTypes?.join(", ") || "Any"}{" "}
                  {maxSizeMB && <>• Max {maxSizeMB}MB</>}
                </p>
              </div>
            )}

            {/* drag area */}
            <div className="ops-dnd">
              <div className="ops-dnd-inner">
                <img
                  src="/assets/images/icons/file.svg"
                  className="ops-dnd-illustration"
                />
                <h4>{attributeName || "Drag and drop your files"}</h4>

                <p className="ops-dnd-sub">
                  {acceptTypes?.length
                    ? `Accept: ${acceptTypes.join(", ")}${maxSizeMB ? `, max ${maxSizeMB}MB` : ""}`
                    : "JPEG, PNG, PDF, and MP4 formats, up to 50MB"}
                </p>

                <button type="button" className="ops-dnd-select" onClick={openPicker}>
                  Select File
                </button>

                {attributeKey && uploadedAttrFiles?.[attributeKey] ? (
                  <p className="ops-dnd-note">1 file selected for {attributeName || attributeKey}</p>
                ) : selectedFiles.length > 0 ? (
                  <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
                ) : null}
              </div>
            </div>

            {/* file list */}
            <div className="ops-uploaded-files">
              <h5>Uploaded Files</h5>

              {/* attribute mode */}
              {attributeKey ? (
                !uploadedAttrFiles?.[attributeKey] ? (
                  <div className="ops-no-files">No file selected</div>
                ) : (
                  <div className="ops-file-row">
                    <div className="ops-file-left">
                      <img src="/assets/images/icons/file.svg" className="ops-file-icon" />
                      <div className="ops-file-meta">
                        <div className="ops-file-name">
                          {uploadedAttrFiles[attributeKey].name}
                        </div>
                        <div className="ops-file-sub">
                          {(uploadedAttrFiles[attributeKey].size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <button className="ops-file-remove" onClick={removeAttributeFile} type="button">
                      <img src="/assets/images/icons/trash.svg" />
                    </button>
                  </div>
                )
              ) : (
                // legacy mode
                <>
                  {selectedFiles.length === 0 ? (
                    <div className="ops-no-files">No files selected</div>
                  ) : (
                    selectedFiles.map((file, idx) => (
                      <div className="ops-file-row" key={idx}>
                        <div className="ops-file-left">
                          <img src="/assets/images/icons/file.svg" className="ops-file-icon" />
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
                          <img src="/assets/images/icons/trash.svg" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* actions */}
            <div className="ops-panel-actions">
              <button className="ops-btn-cancel" onClick={() => setOpenPanel(false)} type="button">
                Cancel
              </button>

              {/* legacy attach */}
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

              {/* attribute attach (close only, parent state updated when validation passed) */}
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


















