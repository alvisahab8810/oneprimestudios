// components/admin-panel/DesignUploads.js
// FIX: Stop querying DesignUpload collection (which has no orderId saved).
// Instead read files directly from the Order item passed as a prop.
// This fixes BOTH bugs:
//   1. Files not showing — was querying by orderId that was never saved
//   2. Files mixing across orders — was querying by productId only, showing all users' files
//
// Usage: <DesignUploads item={orderItem} />
// where orderItem is one element from order.items array

"use client";

export default function DesignUploads({ item }) {
  if (!item) return null;

  // Collect all files from this order item
  // uploadedAttributeFiles: [{ attributeName, name, url }]
  // uploadedFiles: ["/uploads/orders/file.pdf", ...]  (legacy)
  const attrFiles = item.uploadedAttributeFiles || [];
  const legacyFiles = item.uploadedFiles || [];

  const totalFiles = attrFiles.length + legacyFiles.length;

  if (totalFiles === 0) {
    return (
      <div className="alert alert-secondary mt-2 mb-0 text-center small">
        No design files uploaded for this item.
      </div>
    );
  }

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  const FileCard = ({ url, name, label }) => (
    <div className="col-md-3 col-sm-6">
      <div className="border rounded p-2 text-center shadow-sm h-100 bg-white">
        {/* Preview for images */}
        {isImage(url) ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={name || "Design File"}
              className="img-fluid rounded mb-2"
              style={{ height: "150px", width: "100%", objectFit: "cover" }}
            />
          </a>
        ) : (
          // Icon for PDF / CDR / other
          <div className="bg-light rounded p-4 mb-2">
            <i className="bi bi-file-earmark-text display-5 text-secondary"></i>
          </div>
        )}

        {/* Attribute label (e.g. "Front Design", "Back Design") */}
        {label && (
          <span className="badge bg-secondary mb-1" style={{ fontSize: 10 }}>
            {label}
          </span>
        )}

        {/* File name */}
        <p className="fw-semibold small mb-1 text-truncate" title={name}>
          {name || url.split("/").pop() || "File"}
        </p>

        {/* Download button */}
        <a
          href={url}
          target="_blank"
          download
          rel="noreferrer"
          className="btn btn-sm btn-outline-primary w-100"
        >
          <i className="bi bi-download me-1"></i>
          Download
        </a>
      </div>
    </div>
  );

  return (
    <div className="card shadow-sm mt-3 border-0">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0 fw-semibold">
          <i className="bi bi-palette me-2 text-primary"></i>
          Uploaded Design Files
        </h6>
        <span className="badge bg-primary">{totalFiles} file(s)</span>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* New attribute-based files */}
          {attrFiles.map((f, i) => (
            <FileCard
              key={`attr-${i}`}
              url={f.url}
              name={f.name}
              label={f.attributeName}
            />
          ))}

          {/* Legacy uploaded files (plain URL strings) */}
          {legacyFiles.map((url, i) => (
            <FileCard
              key={`legacy-${i}`}
              url={url}
              name={url.split("/").pop()}
              label={null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}



// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "sonner";

// export default function DesignUploads({ productId, orderId, userId }) {

//   const [designs, setDesigns] = useState([]);
//   const [loading, setLoading] = useState(true);

// useEffect(() => {
//   if (!productId || !orderId) {
//     setLoading(false);
//     return;
//   }

//   fetchDesigns();
// }, [productId, orderId, userId]);

//  const fetchDesigns = async () => {
//   try {
//     setLoading(true);

//     let url = `/api/upload/save-design?productId=${productId}`;

//     if (orderId) {
//       url += `&orderId=${orderId}`;
//     }

//     if (userId) {
//       url += `&userId=${userId}`;
//     }

//     const res = await axios.get(url);
//     setDesigns(res.data?.data || []);
//   } catch (err) {
//     console.error("❌ Error fetching designs:", err);
//     toast.error("Failed to load design files.");
//   } finally {
//     setLoading(false);
//   }
// };


//   if (loading)
//     return (
//       <div className="text-center text-muted my-3">
//         <div className="spinner-border spinner-border-sm me-2" />
//         Loading uploaded designs...
//       </div>
//     );

//   if (!designs.length)
//     return (
//       <div className="alert alert-secondary mt-3 mb-0 text-center small">
//         No designs uploaded for this product yet.
//       </div>
//     );

//   return (
//     <div className="card shadow-sm mt-4 border-0">
//       <div className="card-header bg-light d-flex justify-content-between align-items-center">
//         <h5 className="mb-0 fw-semibold">
//           <i className="bi bi-palette me-2 text-primary"></i>
//           Uploaded Designs
//         </h5>
//         <span className="badge bg-primary">{designs.length} file(s)</span>
//       </div>
//       <div className="card-body">
//         <div className="row g-3">
//           {designs.map((design) => (
//             <div key={design._id} className="col-md-3 col-sm-6">
//               <div className="border rounded p-2 text-center shadow-sm h-100 bg-white hover-shadow-sm">
//                 {design.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
//                   <a
//                     href={design.fileUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                   >
//                     <img
//                       src={design.fileUrl}
//                       alt={design.fileName || "Design File"}
//                       className="img-fluid rounded mb-2"
//                       style={{
//                         height: "150px",
//                         width: "100%",
//                         objectFit: "cover",
//                       }}
//                     />
//                   </a>
//                 ) : (
//                   <div className="bg-light rounded p-4 mb-2">
//                     <i className="bi bi-file-earmark-text display-5 text-secondary"></i>
//                   </div>
//                 )}

//                 <p
//                   className="fw-semibold small mb-1 text-truncate"
//                   title={design.fileName}
//                 >
//                   {design.fileName}
//                 </p>

//                 <p className="text-muted small mb-2">
//                   <i className="bi bi-calendar me-1"></i>
//                   {new Date(design.createdAt).toLocaleDateString()}
//                 </p>

//                 <a
//                   href={design.fileUrl}
//                   target="_blank"
//                   download
//                   className="btn btn-sm btn-outline-primary w-100"
//                 >
//                   <i className="bi bi-download me-1"></i>
//                   Download
//                 </a>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }