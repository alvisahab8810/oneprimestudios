// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "sonner";

// export default function DesignUploads({ productId }) {
//   const [designs, setDesigns] = useState([]);
//   const [loading, setLoading] = useState(true);

// useEffect(() => {
//   if (!productId) {
//     console.warn("⚠️ No productId passed to DesignUploads");
//     return;
//   }
//   console.log("🟢 Fetching designs for productId:", productId);
//   fetchDesigns();
// }, [productId]);


//   const fetchDesigns = async () => {
//     try {
//       const res = await axios.get(`/api/upload/save-design?productId=${productId}`);
//       setDesigns(res.data.data || []);
//     } catch (err) {
//       console.error("Error fetching designs:", err);
//       toast.error("Failed to load design files.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return <p className="text-muted">Loading uploaded designs...</p>;
//   }

//   if (!designs.length) {
//     return <p className="text-muted">No designs uploaded for this product yet.</p>;
//   }

//   return (
//     <div className="card shadow-sm mt-4">
//       <div className="card-header bg-light d-flex justify-content-between align-items-center">
//         <h5 className="mb-0 fw-semibold">
//           <i className="bi bi-palette me-2"></i>Uploaded Designs
//         </h5>
//         <span className="badge bg-secondary">{designs.length} file(s)</span>
//       </div>
//       <div className="card-body">
//         <div className="row g-3">
//           {designs.map((design) => (
//             <div key={design._id} className="col-md-3 col-sm-6">
//               <div className="border rounded p-2 text-center shadow-sm h-100">
//                 {design.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
//                   <a href={design.fileUrl} target="_blank" rel="noopener noreferrer">
//                     <img
//                       src={design.fileUrl}
//                       alt={design.fileName || "Design File"}
//                       className="img-fluid rounded mb-2"
//                       style={{ height: "150px", objectFit: "cover" }}
//                     />
//                   </a>
//                 ) : (
//                   <div className="bg-light rounded p-4 mb-2">
//                     <i className="bi bi-file-earmark-text display-5 text-secondary"></i>
//                   </div>
//                 )}
//                 <p className="fw-semibold small mb-1 text-truncate">{design.fileName}</p>
//                 {design.user && (
//                   <p className="text-muted small mb-2">
//                     <i className="bi bi-person me-1"></i>
//                     {design.user.name || "Unknown"}
//                   </p>
//                 )}
//                 <a
//                   href={design.fileUrl}
//                   target="_blank"
//                   download
//                   className="btn btn-sm btn-outline-primary w-100"
//                 >
//                   <i className="bi bi-download me-1"></i>Download
//                 </a>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }





"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export default function DesignUploads({ productId, userId }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      console.warn("⚠️ Missing productId in DesignUploads");
      setLoading(false);
      return;
    }
    fetchDesigns();
  }, [productId, userId]);

  const fetchDesigns = async () => {

    console.log("🔍 Fetching designs for:", { productId, userId });
    try {
      setLoading(true);
      

      // build API URL dynamically
      let url = `/api/upload/save-design?productId=${productId}`;
      if (userId) url += `&userId=${userId}`;

      const res = await axios.get(url);
      setDesigns(res.data?.data || []);
    } catch (err) {
      console.error("❌ Error fetching designs:", err);
      toast.error("Failed to load design files.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center text-muted my-3">
        <div className="spinner-border spinner-border-sm me-2" />
        Loading uploaded designs...
      </div>
    );

  if (!designs.length)
    return (
      <div className="alert alert-secondary mt-3 mb-0 text-center small">
        No designs uploaded for this product yet.
      </div>
    );

  return (
    <div className="card shadow-sm mt-4 border-0">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-semibold">
          <i className="bi bi-palette me-2 text-primary"></i>
          Uploaded Designs
        </h5>
        <span className="badge bg-primary">{designs.length} file(s)</span>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {designs.map((design) => (
            <div key={design._id} className="col-md-3 col-sm-6">
              <div className="border rounded p-2 text-center shadow-sm h-100 bg-white hover-shadow-sm">
                {design.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <a
                    href={design.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={design.fileUrl}
                      alt={design.fileName || "Design File"}
                      className="img-fluid rounded mb-2"
                      style={{
                        height: "150px",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </a>
                ) : (
                  <div className="bg-light rounded p-4 mb-2">
                    <i className="bi bi-file-earmark-text display-5 text-secondary"></i>
                  </div>
                )}

                <p
                  className="fw-semibold small mb-1 text-truncate"
                  title={design.fileName}
                >
                  {design.fileName}
                </p>

                <p className="text-muted small mb-2">
                  <i className="bi bi-calendar me-1"></i>
                  {new Date(design.createdAt).toLocaleDateString()}
                </p>

                <a
                  href={design.fileUrl}
                  target="_blank"
                  download
                  className="btn btn-sm btn-outline-primary w-100"
                >
                  <i className="bi bi-download me-1"></i>
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
