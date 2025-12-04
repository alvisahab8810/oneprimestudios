
// components/ProductFileUpload.jsx
import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";

/**
 * ProductFileUpload
 *
 * Supports:
 * - Legacy multi-file upload (selectedFiles, setSelectedFiles, setFiles, uploadFiles)
 * - Attribute single-file upload (attributeName, attributeKey, uploadedAttrFiles, setUploadedAttrFiles,
 *   acceptTypes, maxSizeMB, imageDimensions)
 *
 * Note: This component intentionally does NOT use prop-types to avoid extra dependency.
 */
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
  imageDimensions = null, // string e.g. "1280x760,760x540" or "1280 x 760"
  singleFile = false,
}) {
  const [openPanel, setOpenPanel] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef(null);

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
    const dims = parseAllowedDims(imageDimensions);
    if (dims.length > 0 && file.type && file.type.startsWith("image/")) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      let settled = false;

      img.onload = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);

        const match = dims.some((d) => d.w === img.width && d.h === img.height);
        if (!match) {
          toast.error(
            `Invalid image size. Allowed: ${dims
              .map((d) => `${d.w}x${d.h}`)
              .join(", ")}. Uploaded: ${img.width}x${img.height}`
          );
          return;
        }

        // passed validation — store under attributeKey
        setUploadedAttrFiles((prev) => ({ ...prev, [attributeKey]: file }));
        toast.success(`File accepted for ${attributeName || attributeKey}`);
      };

      img.onerror = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        toast.error("Unable to read image — upload a valid image file.");
      };

      img.src = url;
      return; // wait for onload
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
          {attributeName ? `Upload ${attributeName}` : "Upload Your Design"}
        </button>
      ) : (
        <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="ops-panel-inner">
            {/* Attribute header (if attribute mode) */}
            {attributeName && (
              <div style={{ marginBottom: 10, textAlign: "left" }}>
                <h4 style={{ margin: 0 }}>{attributeName}</h4>
                {imageDimensions && (
                  <p style={{ fontSize: 13, margin: "4px 0", color: "#555" }}>
                    <strong>Required Size:</strong> {imageDimensions}
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





















// import React, { useState, useRef } from "react";

// export default function ProductFileUpload({
//   product,
//   selectedFiles = [],
//   setSelectedFiles,
//   setFiles, // ← IMPORTANT: your original flow needs this
//   uploadFiles,
//   onUploadUrl,
// }) {
//   const [openPanel, setOpenPanel] = useState(false);
//   const [urlValue, setUrlValue] = useState("");
//   const fileInputRef = useRef(null);

//   // SAME AS YOUR OLD WORKING handleFiles()
//   const handlePickedFiles = (fileList) => {
//     const arr = Array.from(fileList);
//     setSelectedFiles(arr);
//     setFiles(arr); // REQUIRED for your uploadFiles() logic
//   };

//   const openPicker = () => fileInputRef.current?.click();

//   const onDrop = (e) => {
//     e.preventDefault();
//     const files = e.dataTransfer?.files;
//     if (files?.length) handlePickedFiles(files);
//   };

//   const onDragOver = (e) => e.preventDefault();

//   const handleUrlUpload = () => {
//     if (onUploadUrl && urlValue.trim()) {
//       onUploadUrl(urlValue.trim());
//       setUrlValue("");
//     }
//   };

//   return (
//     // <div className="ops-file-uploader">
//       <div className={`ops-file-uploader ${openPanel ? "expanded" : ""}`}>

//       {/* REAL Hidden File Input (old system) */}
//       <input
//         ref={fileInputRef}
//         id="b2bFileUpload"
//         type="file"
//         multiple
//         style={{ display: "none" }}
//         onChange={(e) => handlePickedFiles(e.target.files)}
//       />

//       {/* CLOSED STATE */}
//       {!openPanel ? (
//         <button className="ops-upload-primary" onClick={() => setOpenPanel(true)}>
//           <img src="/assets/images/icons/upload.svg" />
//           Upload Your Design
//         </button>
//       ) : (
//         <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
//           <div className="ops-panel-inner">

//             {/* DRAG AREA */}
//             <div className="ops-dnd">
//               <div className="ops-dnd-inner">
//                 <img src="/assets/images/icons/file.svg" className="ops-dnd-illustration" />
//                 <h4>Drag and drop your files</h4>
//                 <p className="ops-dnd-sub">
//                   JPEG, PNG, PDF, and MP4 formats, up to 50MB
//                 </p>

//                 <button type="button" className="ops-dnd-select" onClick={openPicker}>
//                   Select File
//                 </button>

//                 {selectedFiles.length > 0 && (
//                   <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
//                 )}
//               </div>
//             </div>

//             {/* URL UPLOAD */}
//             {/* <div className="ops-url-row">
//               <label className="ops-url-label">or upload from URL</label>
//               <div className="ops-url-input-row">
//                 <input
//                   type="text"
//                   placeholder="Add file URL"
//                   value={urlValue}
//                   onChange={(e) => setUrlValue(e.target.value)}
//                 />
//                 <button className="ops-btn-ghost" onClick={handleUrlUpload}>Upload</button>
//               </div>
//             </div> */}

//             {/* FILE LIST */}
//             <div className="ops-uploaded-files">
//               <h5>Uploaded Files</h5>

//               {selectedFiles.length === 0 ? (
//                 <div className="ops-no-files">No files selected</div>
//               ) : (
//                 selectedFiles.map((file, idx) => (
//                   <div className="ops-file-row" key={idx}>
//                     <div className="ops-file-left">
//                       <img src="/assets/images/icons/file.svg" className="ops-file-icon" />
//                       <div className="ops-file-meta">
//                         <div className="ops-file-name">{file.name}</div>
//                         <div className="ops-file-sub">
//                           {(file.size / 1024).toFixed(1)} KB
//                         </div>
//                       </div>
//                     </div>

//                     <button type="button" className="ops-file-remove"
//                       onClick={() => {
//                         const arr = selectedFiles.filter((_, i) => i !== idx);
//                         setSelectedFiles(arr);
//                         setFiles(arr);
//                       }}>
//                       <img src="/assets/images/icons/trash.svg" />
//                     </button>
//                   </div>
//                 ))
//               )}
//             </div>

//             {/* ACTION BUTTONS */}
//             <div className="ops-panel-actions">
//               <button className="ops-btn-cancel" onClick={() => setOpenPanel(false)}>Cancel</button>

//               <button
//                 className="ops-btn-primary"
//                 disabled={selectedFiles.length === 0}
//                 // onClick={uploadFiles}
//                 onClick={async () => {
//                 await uploadFiles();
//                 setOpenPanel(false);        // <-- auto-close drawer
//               }}

//               >
//                 Attach File
//               </button>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// }







