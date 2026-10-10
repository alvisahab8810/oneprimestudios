"use client";

// Partner → Rate List → one product group. Pick a courier, press Show, and the
// printed rate card appears: every quantity we quote, with GST and the chosen
// courier's delivery charge already in the price.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiPrinter, FiDownload } from "react-icons/fi";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Excel opens a CSV straight away, so no spreadsheet library has to ship with
// the page. Quotes are doubled, which is how CSV escapes them.
// A row is priced for one combination of the product's choices, which is what
// the DETAIL column prints. A product without choices falls back to its own
// short description.
const rowDetailText = (row, product) =>
  row.detailParts?.length
    ? row.detailParts.map((part) => `${part.name}: ${part.value}`).join("; ")
    : product.detail || "";

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function RateListCategory() {
  const router = useRouter();
  const { slug } = router.query;

  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState("");
  const [courierNote, setCourierNote] = useState("");
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState("");

  // Couriers are quoted live for the pincode already held on the partner, so
  // they never have to type a delivery pincode here
  const loadCouriers = useCallback(async () => {
    setLoadingCouriers(true);
    try {
      const res = await axios.get("/api/rate-list/couriers", { withCredentials: true });
      setCouriers(Array.isArray(res.data?.couriers) ? res.data.couriers : []);
      setCourierNote(res.data?.message || "");
      setCourierId("");
    } catch (err) {
      setDenied(err.response?.data?.message || "Could not load couriers");
    } finally {
      setLoadingCouriers(false);
    }
  }, []);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  const show = useCallback(async () => {
    if (!slug) return;
    if (!courierId) return toast.error("Please select a courier");

    setLoading(true);
    try {
      const res = await axios.get(`/api/rate-list/${slug}`, {
        params: { courier: courierId },
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the rate list");
    } finally {
      setLoading(false);
    }
  }, [slug, courierId]);

  const exportCsv = () => {
    if (!data?.groups?.length) return;

    const lines = [
      [data.category.name, "Rate List"].map(csvCell).join(","),
      ["Courier", data.courier?.name || ""].map(csvCell).join(","),
      ["Delivery pincode", data.pincode || ""].map(csvCell).join(","),
      [],
      ["Group", "Product", "Quantity", "Detail", "Price (incl. GST)"].map(csvCell).join(","),
    ];

    for (const group of data.groups) {
      for (const product of group.products) {
        for (const row of product.rows) {
          lines.push(
            [group.name, product.name, row.quantity, rowDetailText(row, product), row.total.toFixed(2)]
              .map(csvCell)
              .join(",")
          );
        }
      }
    }

    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.category.slug}-rate-list.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const title = data?.category?.name || String(slug || "").replace(/-/g, " ");

  return (
    <div className="rate-list-page">
      <Topbar />
      <Offcanvas />

      <div className="container py-5">
        <div className="rate-head">
          <h1 className="rate-title">{title.toUpperCase()} RATE LIST</h1>
          {data?.groups?.length > 0 && (
            <div className="rate-actions no-print">
              <button type="button" className="rate-icon-btn" onClick={() => window.print()}>
                <FiPrinter /> Print
              </button>
              <button type="button" className="rate-icon-btn excel" onClick={exportCsv}>
                <FiDownload /> Excel
              </button>
            </div>
          )}
        </div>

        {denied ? (
          <div className="rate-notice">
            <p className="mb-3">{denied}</p>
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="rate-picker no-print">
              <div className="row g-3 align-items-end">
                <div className="col-sm-7 col-md-4">
                  <label className="form-label fw-semibold" htmlFor="courier">
                    Select Courier
                  </label>
                  <select
                    id="courier"
                    className="form-select"
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    disabled={loadingCouriers}
                  >
                    <option value="">{loadingCouriers ? "Loading couriers..." : "--Select--"}</option>
                    {couriers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.etd ? `${c.name} — by ${c.etd}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-sm-3 col-md-2">
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={show}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Show"}
                  </button>
                </div>
              </div>

              {courierNote && <p className="text-muted small mt-2 mb-0">{courierNote}</p>}
              {!loadingCouriers && couriers.length === 0 && !courierNote && (
                <p className="text-muted small mt-2 mb-0">
                  No courier is available right now. Please try again in a little while.
                </p>
              )}
            </div>

            {data && (
              <div className="rate-tables">
                <p className="rate-courier-line">
                  Courier: <strong>{data.courier?.name}</strong>
                  {data.pincode ? (
                    <>
                      {" "}
                      · Delivery to <strong>{data.pincode}</strong>
                    </>
                  ) : null}
                </p>

                {data.groups.length === 0 ? (
                  <p className="text-muted py-4">No rates are published for this group yet.</p>
                ) : (
                  data.groups.map((group) => (
                    <div className="rate-group" key={group.name}>
                      <div className="rate-group-head">{group.name}</div>
                      <div className="table-responsive">
                        <table className="rate-table">
                          <thead>
                            <tr>
                              <th>PRODUCT</th>
                              <th className="text-center">QUANTITY</th>
                              <th>DETAIL</th>
                              <th className="text-end">PRICE (INCL. GST)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.products.map((product) =>
                              product.rows.map((row, i) => (
                                <tr key={`${product._id}-${i}`}>
                                  {/* The name is printed once per product, the way a rate card reads */}
                                  <td className="rate-product">{i === 0 ? product.name : ""}</td>
                                  <td className="text-center">
                                    <span className="rate-qty">{row.quantity}</span>
                                  </td>
                                  <td className="rate-detail">
                                    {row.detailParts?.length
                                      ? row.detailParts.map((part, p) => (
                                          <span key={part.name}>
                                            {p > 0 ? "; " : ""}
                                            <strong>{part.name}:</strong> {part.value}
                                          </span>
                                        ))
                                      : i === 0
                                      ? product.detail
                                      : ""}
                                  </td>
                                  <td className="text-end rate-price">{money(row.total)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}

                <p className="rate-foot">
                  Prices include GST and the delivery charge for the selected courier. Rates are
                  indicative and may change without notice.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      <style jsx>{`
        .rate-head {
          position: relative;
          margin-bottom: 2rem;
        }
        .rate-title {
          text-align: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #15417e;
          margin: 0;
        }
        .rate-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 1rem;
        }
        .rate-icon-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid #15417e;
          background: #fff;
          color: #15417e;
          border-radius: 6px;
          padding: 0.35rem 0.9rem;
          font-size: 0.9rem;
        }
        .rate-icon-btn.excel {
          border-color: #1d7044;
          color: #1d7044;
        }
        .rate-notice {
          max-width: 520px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          border: 1px solid #e3e7ef;
          border-radius: 10px;
          background: #f8fafc;
        }
        .rate-picker {
          margin-bottom: 1.5rem;
        }
        .rate-courier-line {
          color: #52607a;
          margin-bottom: 1rem;
        }
        .rate-group {
          margin-bottom: 1.75rem;
        }
        .rate-group-head {
          background: #1d3557;
          color: #fff;
          font-weight: 600;
          padding: 0.6rem 1rem;
          border-radius: 4px 4px 0 0;
        }
        .rate-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .rate-table th {
          background: #eef2f7;
          color: #3b4a63;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 0.55rem 1rem;
          white-space: nowrap;
        }
        .rate-table td {
          padding: 0.55rem 1rem;
          border-bottom: 1px solid #edf0f5;
        }
        .rate-product {
          font-weight: 500;
          color: #1d3557;
        }
        .rate-detail {
          color: #5a6880;
        }
        .rate-qty {
          display: inline-block;
          min-width: 44px;
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
          background: #1d6fd1;
          color: #fff;
          font-size: 0.8rem;
          font-variant-numeric: tabular-nums;
        }
        .rate-price {
          color: #1d7044;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .rate-foot {
          color: #7b879c;
          font-size: 0.85rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 575px) {
          .rate-title {
            font-size: 1.25rem;
          }
        }
      `}</style>

      <style jsx global>{`
        @media print {
          .ops-header,
          .ops-topbar,
          header,
          footer,
          .category-nav,
          .no-print {
            display: none !important;
          }
          .rate-list-page {
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
}
