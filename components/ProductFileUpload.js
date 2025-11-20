import React, { useState, useRef } from "react";

export default function ProductFileUpload({
  product,
  selectedFiles = [],
  setSelectedFiles,
  setFiles, // ← IMPORTANT: your original flow needs this
  uploadFiles,
  onUploadUrl,
}) {
  const [openPanel, setOpenPanel] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef(null);

  // SAME AS YOUR OLD WORKING handleFiles()
  const handlePickedFiles = (fileList) => {
    const arr = Array.from(fileList);
    setSelectedFiles(arr);
    setFiles(arr); // REQUIRED for your uploadFiles() logic
  };

  const openPicker = () => fileInputRef.current?.click();

  const onDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) handlePickedFiles(files);
  };

  const onDragOver = (e) => e.preventDefault();

  const handleUrlUpload = () => {
    if (onUploadUrl && urlValue.trim()) {
      onUploadUrl(urlValue.trim());
      setUrlValue("");
    }
  };

  return (
    <div className="ops-file-uploader">

      {/* REAL Hidden File Input (old system) */}
      <input
        ref={fileInputRef}
        id="b2bFileUpload"
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handlePickedFiles(e.target.files)}
      />

      {/* CLOSED STATE */}
      {!openPanel ? (
        <button className="ops-upload-primary" onClick={() => setOpenPanel(true)}>
          <img src="/assets/images/icons/upload.svg" />
          Upload Your Design
        </button>
      ) : (
        <div className="ops-panel" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="ops-panel-inner">

            {/* DRAG AREA */}
            <div className="ops-dnd">
              <div className="ops-dnd-inner">
                <img src="/assets/images/icons/file.svg" className="ops-dnd-illustration" />
                <h4>Drag and drop your files</h4>
                <p className="ops-dnd-sub">
                  JPEG, PNG, PDF, and MP4 formats, up to 50MB
                </p>

                <button type="button" className="ops-dnd-select" onClick={openPicker}>
                  Select File
                </button>

                {selectedFiles.length > 0 && (
                  <p className="ops-dnd-note">{selectedFiles.length} file(s) selected</p>
                )}
              </div>
            </div>

            {/* URL UPLOAD */}
            {/* <div className="ops-url-row">
              <label className="ops-url-label">or upload from URL</label>
              <div className="ops-url-input-row">
                <input
                  type="text"
                  placeholder="Add file URL"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
                <button className="ops-btn-ghost" onClick={handleUrlUpload}>Upload</button>
              </div>
            </div> */}

            {/* FILE LIST */}
            <div className="ops-uploaded-files">
              <h5>Uploaded Files</h5>

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

                    <button type="button" className="ops-file-remove"
                      onClick={() => {
                        const arr = selectedFiles.filter((_, i) => i !== idx);
                        setSelectedFiles(arr);
                        setFiles(arr);
                      }}>
                      <img src="/assets/images/icons/trash.svg" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="ops-panel-actions">
              <button className="ops-btn-cancel" onClick={() => setOpenPanel(false)}>Cancel</button>

              <button
                className="ops-btn-primary"
                disabled={selectedFiles.length === 0}
                onClick={uploadFiles}
              >
                Attach File
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
