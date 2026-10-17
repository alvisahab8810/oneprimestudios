"use client";
// Partner → pay by bank transfer and tell us about it. The wallet is credited
// only after our team verifies the payment, so this page shows the status of
// every request the partner has raised.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";
import { MANUAL_TOPUP_BANK, MANUAL_TOPUP_MODES } from "@/config/bankDetails";

const EMPTY_FORM = {
  amount: "",
  paymentMode: "NEFT",
  referenceNumber: "",
  paidAt: "",
  note: "",
};

const STATUS_STYLE = {
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Pending" },
  approved: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", label: "Approved" },
  rejected: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Rejected" },
};

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const StatusPill = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        padding: "3px 12px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

export default function ManualWalletTopup() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/partner/wallet/manual-topup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data.requests || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Please sign in as a partner");
        router.push("/login");
        return;
      }
      toast.error("Could not load your requests");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter the amount you transferred");
      return;
    }
    if (form.referenceNumber.trim().length < 4) {
      toast.error("Enter the UTR / reference number from your bank");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const data = new FormData();
      data.append("amount", String(amount));
      data.append("paymentMode", form.paymentMode);
      data.append("referenceNumber", form.referenceNumber.trim());
      data.append("paidAt", form.paidAt);
      data.append("note", form.note.trim());
      if (file) data.append("screenshot", file);

      const res = await axios.post("/api/partner/wallet/manual-topup", data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(res.data.message || "Request submitted");
      setForm(EMPTY_FORM);
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  };

  const bankRows = [
    ["Bank Name", MANUAL_TOPUP_BANK.bankName],
    ["Branch", MANUAL_TOPUP_BANK.branch],
    ["Firm Name", MANUAL_TOPUP_BANK.firmName],
    ["IFSC Code", MANUAL_TOPUP_BANK.ifsc],
    ["A/C No", MANUAL_TOPUP_BANK.accountNumber],
  ];

  return (
    <div className="wallet-area">
      <Topbar />
      <Offcanvas />

      <div className="wallet-wrap manual-topup">
        <div className="wallet-header">
          <h2>Manual Payment</h2>
          <span className="wallet-subtitle">
            Transfer to our bank account and submit the reference below
          </span>
        </div>

        {/* The instant option stays one click away */}
        <div className="mt-note">
          <div>
            <strong>Faster option:</strong> pay by UPI QR code and the amount is added to your
            wallet automatically — no reference or screenshot needed.
          </div>
          <button
            type="button"
            className="wallet-btn primary"
            onClick={() => router.push("/partner/wallet/add")}
          >
            Pay via QR Code
          </button>
        </div>

        <div className="mt-grid">
          {/* ── BANK DETAILS ─────────────────────────────────────────── */}
          <div className="mt-card">
            <h3 className="mt-card-title">Our Bank Details</h3>

            <table className="mt-bank-table">
              <tbody>
                {bankRows.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td>
                      <span>{value}</span>
                      <button
                        type="button"
                        className="mt-copy"
                        onClick={() => copy(value, label)}
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
                {MANUAL_TOPUP_BANK.upiId && (
                  <tr>
                    <th>UPI ID</th>
                    <td>
                      <span>{MANUAL_TOPUP_BANK.upiId}</span>
                      <button
                        type="button"
                        className="mt-copy"
                        onClick={() => copy(MANUAL_TOPUP_BANK.upiId, "UPI ID")}
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-info">
              <strong>How it works</strong>
              <ol>
                <li>Transfer the amount to the account above using NEFT, RTGS, IMPS or UPI.</li>
                <li>Submit the form with your UTR / reference number and a screenshot.</li>
                <li>
                  Our accounts team verifies it and your wallet is credited. You can follow the
                  status below.
                </li>
              </ol>
              {MANUAL_TOPUP_BANK.whatsappNumber && (
                <p className="mt-whatsapp">
                  You may also send the screenshot on WhatsApp to{" "}
                  <strong>{MANUAL_TOPUP_BANK.whatsappNumber}</strong> with your company name — but
                  submitting the form here is faster and lets you track the status.
                </p>
              )}
            </div>
          </div>

          {/* ── FORM ─────────────────────────────────────────────────── */}
          <div className="mt-card">
            <h3 className="mt-card-title">Submit Payment Details</h3>

            <form onSubmit={handleSubmit}>
              <label className="wallet-label">Amount Transferred *</label>
              <input
                type="number"
                name="amount"
                className="wallet-input"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 5000"
                min="1"
                required
              />

              <label className="wallet-label">Paid Using *</label>
              <select
                name="paymentMode"
                className="wallet-input"
                value={form.paymentMode}
                onChange={handleChange}
              >
                {MANUAL_TOPUP_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>

              <label className="wallet-label">UTR / Reference Number *</label>
              <input
                type="text"
                name="referenceNumber"
                className="wallet-input"
                value={form.referenceNumber}
                onChange={handleChange}
                placeholder="From your bank receipt"
                required
              />

              <label className="wallet-label">Date of Payment</label>
              <input
                type="date"
                name="paidAt"
                className="wallet-input"
                value={form.paidAt}
                onChange={handleChange}
              />

              <label className="wallet-label">Payment Screenshot</label>
              <input
                type="file"
                className="wallet-input"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="mt-hint">
                Optional, but attaching it gets your wallet credited much faster.
              </p>

              <label className="wallet-label">Note for our team</label>
              <textarea
                name="note"
                className="wallet-input"
                rows={3}
                value={form.note}
                onChange={handleChange}
                placeholder="Anything we should know"
                style={{ resize: "none" }}
              />

              <button
                type="submit"
                className="wallet-btn primary full"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit for Verification"}
              </button>
            </form>
          </div>
        </div>

        {/* ── MY REQUESTS ───────────────────────────────────────────── */}
        <div className="mt-card mt-full">
          <h3 className="mt-card-title">My Requests</h3>

          {loading ? (
            <p className="mt-empty">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="mt-empty">You have not submitted any manual payment yet.</p>
          ) : (
            <div className="mt-table-scroll">
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.requestNumber}</td>
                      <td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontWeight: 700 }}>{money(r.amount)}</td>
                      <td>{r.paymentMode}</td>
                      <td>{r.referenceNumber}</td>
                      <td>
                        {r.screenshotUrl ? (
                          <a href={r.screenshotUrl} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <StatusPill status={r.status} />
                      </td>
                      <td style={{ maxWidth: 240, whiteSpace: "normal" }}>
                        {r.adminRemarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .manual-topup .mt-note {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .manual-topup .mt-note > div {
          flex: 1 1 320px;
        }
        .manual-topup .mt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
          gap: 20px;
        }
        .manual-topup .mt-card {
          background: #fff;
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          padding: 22px;
        }
        .manual-topup .mt-full {
          margin-top: 20px;
        }
        .manual-topup .mt-card-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #0d0d0d;
        }
        .manual-topup .mt-bank-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .manual-topup .mt-bank-table th,
        .manual-topup .mt-bank-table td {
          border: 1px solid #ededed;
          padding: 9px 12px;
          text-align: left;
        }
        .manual-topup .mt-bank-table th {
          width: 36%;
          background: #fafafa;
          color: #6b7280;
          font-weight: 600;
        }
        .manual-topup .mt-bank-table td {
          font-weight: 600;
          color: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .manual-topup .mt-copy {
          border: 1px solid #e5e5e5;
          background: #fff;
          color: #6b7280;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          cursor: pointer;
        }
        .manual-topup .mt-copy:hover {
          background: #f2f2f2;
          color: #0d0d0d;
        }
        .manual-topup .mt-info {
          margin-top: 18px;
          background: #f8f9fc;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 13.5px;
          color: #4b5563;
        }
        .manual-topup .mt-info ol {
          margin: 8px 0 0;
          padding-left: 18px;
        }
        .manual-topup .mt-info li {
          margin-bottom: 5px;
        }
        .manual-topup .mt-whatsapp {
          margin: 12px 0 0;
          padding-top: 12px;
          border-top: 1px solid #e7e7e7;
        }
        .manual-topup .wallet-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 13.5px;
        }
        .manual-topup .wallet-input {
          width: 100%;
          margin-bottom: 14px;
        }
        .manual-topup .mt-hint {
          margin: -8px 0 14px;
          font-size: 12.5px;
          color: #6b7280;
        }
        .manual-topup .mt-empty {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }
        .manual-topup .mt-table-scroll {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #d6d9e0 transparent;
        }
        .manual-topup .mt-table-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .manual-topup .mt-table-scroll::-webkit-scrollbar-thumb {
          background: #d6d9e0;
          border-radius: 999px;
        }
        .manual-topup .mt-table {
          width: 100%;
          min-width: 880px;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .manual-topup .mt-table th {
          text-align: left;
          background: #f9fafb;
          color: #6b7280;
          font-weight: 600;
          padding: 10px 12px;
          white-space: nowrap;
        }
        .manual-topup .mt-table td {
          padding: 11px 12px;
          border-top: 1px solid #f1f2f4;
          color: #0d0d0d;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
