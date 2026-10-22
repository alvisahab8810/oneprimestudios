"use client";
// The order sheet a partner opens from the Order Status table: what was
// ordered, the remarks that came with it, the files attached to it, and the
// way through to the production log and the file history.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { downloadFile } from "@/lib/downloadDocument";
import { FiClock, FiFileText, FiDownload, FiArrowLeft } from "react-icons/fi";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function OrderStatusDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [downloading, setDownloading] = useState(false);

  const authHeader = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/${id}`, { headers: authHeader() });
      setOrder(res.data.order);
    } catch (err) {
      if (err?.response?.status === 401) {
        router.replace("/login");
        return;
      }
      toast.error(err?.response?.data?.message || "Could not load this order");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    load();

    // The complete PDF is the tax invoice, so what exists has to be looked up
    axios
      .get(`/api/orders/documents/${id}`, { headers: authHeader() })
      .then((res) => setInvoices(res.data?.invoices || []))
      .catch(() => {});
  }, [id, load, router]);

  const downloadInvoice = async () => {
    const invoice = invoices[0];
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadFile(
        `/api/orders/documents/download?type=invoice&id=${invoice.id}`,
        `${invoice.invoiceNumber}.pdf`
      );
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // Everything the buyer attached, item by item
  const assets = [];
  (order?.items || []).forEach((item, index) => {
    const label = item.product?.name || item.productName || `Item ${index + 1}`;
    (item.uploadedFiles || []).forEach((url) =>
      assets.push({ url, name: String(url).split("/").pop(), label })
    );
    (item.uploadedAttributeFiles || []).forEach((file) => {
      if (file?.url) {
        assets.push({
          url: file.url,
          name: file.name || String(file.url).split("/").pop(),
          label: `${label} · ${file.attributeName || "Attachment"}`,
        });
      }
    });
  });
  (order?.reuploadedFiles || []).forEach((file) => {
    if (file?.fileUrl) {
      assets.push({
        url: file.fileUrl,
        name: String(file.fileUrl).split("/").pop(),
        label: "Re-uploaded design",
      });
    }
  });

  const remarks = [order?.customerRemarks, order?.remarks]
    .filter((text) => text && String(text).trim())
    .concat((order?.items || []).map((i) => i.remarks).filter(Boolean));

  if (loading) {
    return (
      <>
        <Topbar />
        <div className="container py-5 text-center text-muted">Loading order…</div>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Topbar />
        <div className="container py-5">
          <div className="osd-empty">
            <h5>This order could not be opened</h5>
            <Link href="/order-status/stage" className="osd-btn">
              Back to Order Status
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Topbar />

      <div className="osd-wrap">
        <div className="container">
          <Link href="/order-status/stage" className="osd-back">
            <FiArrowLeft /> Back to Order Status
          </Link>

          <div className="osd-card">
            <div className="osd-top">
              <div>
                <span className="osd-eyebrow">Order</span>
                <h1>#{order.orderNumber || String(order._id).slice(-8)}</h1>
                <p>{order.orderName || "—"}</p>
              </div>
              <span className="osd-pill">{String(order.status || "").toUpperCase()}</span>
            </div>

            {/* PRODUCT & DETAILS */}
            <section className="osd-section">
              <h2>Product &amp; Details</h2>
              <div className="osd-items">
                {(order.items || []).map((item, index) => (
                  <div className="osd-item" key={index}>
                    <div className="osd-item-head">
                      <strong>{item.product?.name || item.productName || "Item"}</strong>
                      <span>
                        {item.quantity || 1} × {money(item.price)}
                      </span>
                    </div>
                    {item.selectedAttrs && Object.keys(item.selectedAttrs).length > 0 && (
                      <ul className="osd-attrs">
                        {Object.entries(item.selectedAttrs).map(([key, value]) => (
                          <li key={key}>
                            <span>{key}</span>
                            {String(
                              value && typeof value === "object"
                                ? value.value ?? value.name ?? JSON.stringify(value)
                                : value
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* IMPORTANT REMARKS */}
            <section className="osd-section">
              <h2>Important Remarks</h2>
              {remarks.length === 0 ? (
                <p className="osd-muted">No remarks were added to this order.</p>
              ) : (
                <ul className="osd-remarks">
                  {remarks.map((text, index) => (
                    <li key={index}>{text}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* ATTACHED ASSETS */}
            <section className="osd-section">
              <h2>Attached Assets</h2>
              {assets.length === 0 ? (
                <p className="osd-muted">No files are attached to this order.</p>
              ) : (
                <div className="osd-assets">
                  {assets.map((asset, index) => {
                    const ext = (asset.name.split(".").pop() || "").toLowerCase();
                    return (
                      <a
                        className="osd-asset"
                        key={index}
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className="osd-asset-preview">
                          {IMAGE_EXT.includes(ext) ? (
                            <img src={asset.url} alt={asset.name} />
                          ) : (
                            <span>{ext.toUpperCase() || "FILE"}</span>
                          )}
                        </div>
                        <div className="osd-asset-meta">
                          <strong>{asset.name}</strong>
                          <span>{asset.label}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ORDER SPECIFICATIONS */}
            <section className="osd-section">
              <h2>Order Specifications</h2>
              <div className="osd-specs">
                <Spec label="Ordered By" value={order.user?.name || "—"} />
                <Spec label="Order For" value={order.orderName || "—"} />
                <Spec
                  label="Delivery"
                  value={
                    [order.shipping?.city, order.shipping?.state].filter(Boolean).join(", ") || "—"
                  }
                />
                <Spec label="Payment" value={order.paymentMethod || "—"} />
                <Spec label="Order Date" value={fmtDate(order.createdAt)} />
                <Spec label="Total Amount" value={money(order.total)} />
                <Spec label="Items" value={String((order.items || []).length)} />
                <Spec
                  label="Invoice"
                  value={invoices[0]?.invoiceNumber || "Not raised yet"}
                />
              </div>
            </section>

            {/* ACTIONS */}
            <div className="osd-actions">
              <Link href={`/order-status/order/${order._id}/production-log`} className="osd-btn">
                <FiClock /> Production Log
              </Link>
              <Link href={`/order-status/order/${order._id}/file-history`} className="osd-btn osd-btn-alt">
                <FiFileText /> File History
              </Link>
              <button
                type="button"
                className="osd-btn osd-btn-dark"
                onClick={downloadInvoice}
                disabled={!invoices.length || downloading}
                title={invoices.length ? "" : "The invoice for this order has not been raised yet"}
              >
                <FiDownload /> {downloading ? "Preparing…" : "Download Complete PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .osd-wrap {
          background: #f6f7f9;
          padding: 24px 0 56px;
          min-height: 60vh;
        }
        .osd-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 14px;
        }
        .osd-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }
        .osd-top {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-start;
          justify-content: space-between;
          padding: 22px 24px;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .osd-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .osd-top h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 2px 0 2px;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }
        .osd-top p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }
        .osd-pill {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .osd-section {
          padding: 20px 24px;
          border-bottom: 1px solid #f3f4f6;
        }
        .osd-section h2 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #16a34a;
          margin: 0 0 14px;
        }
        .osd-muted {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }
        .osd-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .osd-item {
          border: 1px solid #f3f4f6;
          border-radius: 8px;
          padding: 14px;
        }
        .osd-item-head {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: space-between;
          font-size: 15px;
          color: #111827;
        }
        .osd-item-head span {
          color: #6b7280;
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .osd-attrs {
          list-style: none;
          margin: 10px 0 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 6px 18px;
        }
        .osd-attrs li {
          font-size: 13px;
          color: #374151;
        }
        .osd-attrs li span {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #9ca3af;
        }
        .osd-remarks {
          margin: 0;
          padding-left: 18px;
          font-size: 14px;
          color: #374151;
        }
        .osd-remarks li + li {
          margin-top: 6px;
        }
        .osd-assets {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }
        .osd-asset {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          display: block;
          background: #fff;
        }
        .osd-asset:hover {
          border-color: #16a34a;
        }
        .osd-asset-preview {
          aspect-ratio: 16 / 10;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .osd-asset-preview img {
          width: 100%;
          height: 100%;
          max-width: 100%;
          object-fit: cover;
        }
        .osd-asset-preview span {
          font-size: 13px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.05em;
        }
        .osd-asset-meta {
          padding: 10px 12px;
        }
        .osd-asset-meta strong {
          display: block;
          font-size: 13px;
          color: #111827;
          word-break: break-all;
        }
        .osd-asset-meta span {
          font-size: 11px;
          color: #9ca3af;
        }
        .osd-specs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 14px 20px;
        }
        .osd-spec span {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 3px;
        }
        .osd-spec strong {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }
        .osd-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 20px 24px;
        }
        .osd-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #16a34a;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .osd-btn:hover {
          color: #fff;
          background: #15803d;
        }
        .osd-btn-alt {
          background: #0ea5e9;
        }
        .osd-btn-alt:hover {
          background: #0284c7;
        }
        .osd-btn-dark {
          background: #111827;
        }
        .osd-btn-dark:hover {
          background: #1f2937;
        }
        .osd-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .osd-empty {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
        }
        @media (max-width: 575px) {
          .osd-section,
          .osd-top,
          .osd-actions {
            padding-left: 16px;
            padding-right: 16px;
          }
          .osd-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}

function Spec({ label, value }) {
  return (
    <div className="osd-spec">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
