"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export default function DesignUploads({ productId }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) fetchDesigns();
  }, [productId]);

  const fetchDesigns = async () => {
    try {
      const res = await axios.get(`/api/upload/save-design?productId=${productId}`);
      setDesigns(res.data.data || []);
    } catch (err) {
      console.error("Error fetching designs:", err);
      toast.error("Failed to load design files.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading uploaded designs...</p>;
  }

  if (!designs.length) {
    return <p className="text-muted">No designs uploaded for this product yet.</p>;
  }

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-semibold">
          <i className="bi bi-palette me-2"></i>Uploaded Designs
        </h5>
        <span className="badge bg-secondary">{designs.length} file(s)</span>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {designs.map((design) => (
            <div key={design._id} className="col-md-3 col-sm-6">
              <div className="border rounded p-2 text-center shadow-sm h-100">
                {design.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <a href={design.fileUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={design.fileUrl}
                      alt={design.fileName || "Design File"}
                      className="img-fluid rounded mb-2"
                      style={{ height: "150px", objectFit: "cover" }}
                    />
                  </a>
                ) : (
                  <div className="bg-light rounded p-4 mb-2">
                    <i className="bi bi-file-earmark-text display-5 text-secondary"></i>
                  </div>
                )}
                <p className="fw-semibold small mb-1 text-truncate">{design.fileName}</p>
                {design.user && (
                  <p className="text-muted small mb-2">
                    <i className="bi bi-person me-1"></i>
                    {design.user.name || "Unknown"}
                  </p>
                )}
                <a
                  href={design.fileUrl}
                  target="_blank"
                  download
                  className="btn btn-sm btn-outline-primary w-100"
                >
                  <i className="bi bi-download me-1"></i>Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
