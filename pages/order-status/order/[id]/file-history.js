"use client";
// Order file upload history: every file that went onto this order, with a
// preview and a download for each one.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { FiArrowLeft, FiDownload } from "react-icons/fi";

const IMAGE_EXT = ["JPG", "JPEG", "PNG", "WEBP", "GIF", "SVG"];

const fmtWhen = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const mb = (bytes) => (bytes ? (bytes / (1024 * 1024)).toFixed(2) : "—");

export default function FileHistoryPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    axios
      .get(`/api/orders/${id}/files`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error(err?.response?.data?.message || "Could not load the file history");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const files = data?.files || [];
  const totals = data?.totals || { uploads: 0, sizeMB: 0, staff: 0, sizeKnown: false };
  // Files uploaded from another machine are not on this server's disk, so
  // their size cannot be read — the column is dropped rather than left empty
  const showSize = !!totals.sizeKnown;
  const columns = showSize ? 9 : 8;

  return (
    <>
      <Topbar />

      <div className="ofh-wrap">
        <div className="container">
          <Link href={`/order-status/order/${id}`} className="ofh-back">
            <FiArrowLeft /> Back to order
          </Link>

          <div className="ofh-head">
            <span className="ofh-eyebrow">Order File Upload History</span>
            <h1>#{data?.orderNumber || "—"}</h1>
          </div>

          <div className="ofh-stats">
            <Stat label="Total Uploads" value={totals.uploads} />
            {showSize && <Stat label="Total Size (MB)" value={totals.sizeMB} />}
            <Stat label="Staff Involved" value={totals.staff} />
          </div>

          <div className="ofh-card">
            <h2>Upload Log</h2>
            <div className="ofh-table-wrap">
              <table className="ofh-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Preview</th>
                    <th>File Name</th>
                    <th>Type</th>
                    {showSize && <th>Size (MB)</th>}
                    <th>Uploaded By</th>
                    <th>Date &amp; Time</th>
                    <th>Remarks</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={columns} className="ofh-note">
                        Loading…
                      </td>
                    </tr>
                  )}

                  {!loading && files.length === 0 && (
                    <tr>
                      <td colSpan={columns} className="ofh-note">
                        No files have been uploaded on this order.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    files.map((file, index) => (
                      <tr key={index}>
                        <td className="ofh-mono">{index + 1}</td>
                        <td>
                          <a
                            className="ofh-thumb"
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {IMAGE_EXT.includes(file.ext) ? (
                              <img src={file.url} alt={file.name} />
                            ) : (
                              <span>{file.ext || "FILE"}</span>
                            )}
                          </a>
                        </td>
                        <td className="ofh-name">{file.name}</td>
                        <td>{file.ext || "—"}</td>
                        {showSize && <td className="ofh-mono">{mb(file.size)}</td>}
                        <td>{file.uploadedBy || "—"}</td>
                        <td className="ofh-mono">{fmtWhen(file.at)}</td>
                        <td className="ofh-remark">
                          {[file.url_label, file.belongsTo].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td>
                          <a className="ofh-dl" href={file.url} download target="_blank" rel="noreferrer">
                            <FiDownload /> Download
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .ofh-wrap {
          background: #f6f7f9;
          padding: 24px 0 56px;
          min-height: 60vh;
        }
        .ofh-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 14px;
        }
        .ofh-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .ofh-head h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 2px 0 18px;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }
        .ofh-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .ofh-stat {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px 18px;
        }
        .ofh-stat span {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .ofh-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          font-weight: 700;
          color: #E10600;
          font-variant-numeric: tabular-nums;
        }
        .ofh-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px 0 0;
        }
        .ofh-card h2 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #E10600;
          margin: 0 20px 12px;
        }
        .ofh-table-wrap {
          overflow-x: auto;
        }
        .ofh-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        .ofh-table th {
          background: #f9fafb;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #6b7280;
          padding: 11px 14px;
          text-align: left;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        .ofh-table td {
          padding: 12px 14px;
          font-size: 13px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .ofh-table tr:last-child td {
          border-bottom: none;
        }
        .ofh-mono {
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .ofh-name {
          max-width: 230px;
          word-break: break-all;
          font-weight: 600;
          color: #111827;
        }
        .ofh-remark {
          max-width: 200px;
          color: #6b7280;
        }
        .ofh-thumb {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 42px;
          border: 1px solid #e5e7eb;
          border-radius: 5px;
          overflow: hidden;
          background: #f3f4f6;
        }
        .ofh-thumb img {
          width: 100%;
          height: 100%;
          max-width: 100%;
          object-fit: cover;
        }
        .ofh-thumb span {
          font-size: 10px;
          font-weight: 700;
          color: #6b7280;
        }
        .ofh-dl {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #E10600;
          color: #fff;
          border-radius: 5px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ofh-dl:hover {
          background: #b50500;
          color: #fff;
        }
        .ofh-note {
          text-align: center;
          padding: 32px 14px !important;
          color: #9ca3af !important;
        }
      `}</style>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="ofh-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
