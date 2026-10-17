"use client";
// Admin → Wallet Management.
// Tab 1: the manual (bank transfer) top-up requests partners raised — approve
//        to credit the wallet, or reject with a reason.
// Tab 2: every partner's balance, with a direct add / deduct control.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiSearch, FiX, FiRefreshCw } from "react-icons/fi";
import { FaWallet } from "react-icons/fa";

const ACCENT = "#1A71F6";

const STATUS_STYLE = {
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Pending" },
  approved: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", label: "Approved" },
  rejected: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Rejected" },
};

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const th = {
  textAlign: "left",
  padding: "12px 14px",
  background: "#f9fafb",
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

const td = {
  padding: "13px 14px",
  borderTop: "1px solid #f1f2f4",
  fontSize: 13.5,
  color: "#0d0d0d",
  whiteSpace: "nowrap",
};

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
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
};

export default function AdminWalletPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("requests");

  // Top-up requests
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Review modal
  const [review, setReview] = useState(null); // { request, action }
  const [remarks, setRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  // Balances
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [partnerSearch, setPartnerSearch] = useState("");

  // Adjustment modal
  const [adjust, setAdjust] = useState(null); // { partner, type }
  const [adjustForm, setAdjustForm] = useState({ amount: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await axios.get("/api/admin/wallet/manual-topups", {
        params: { status: statusFilter, search },
        withCredentials: true,
      });
      setRequests(res.data.requests || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load requests");
    } finally {
      setLoadingRequests(false);
    }
  }, [statusFilter, search]);

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const res = await axios.get("/api/admin/wallet/balances", {
        withCredentials: true,
      });
      setPartners(res.data.partners || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load balances");
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const openReview = (request, action) => {
    setReview({ request, action });
    setRemarks("");
  };

  const submitReview = async () => {
    if (!review) return;
    if (review.action === "reject" && !remarks.trim()) {
      toast.error("Please write why it is being rejected");
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.put(
        `/api/admin/wallet/manual-topups/${review.request._id}`,
        { action: review.action, remarks: remarks.trim() },
        { withCredentials: true }
      );
      toast.success(res.data.message || "Done");
      setReview(null);
      setRemarks("");
      loadRequests();
      loadPartners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not process the request");
    } finally {
      setProcessing(false);
    }
  };

  const openAdjust = (partner, type) => {
    setAdjust({ partner, type });
    setAdjustForm({ amount: "", reason: "" });
  };

  const submitAdjust = async () => {
    if (!adjust) return;
    const amount = Number(adjustForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (!adjustForm.reason.trim()) {
      toast.error("Please write the reason for this adjustment");
      return;
    }

    try {
      setAdjusting(true);
      const res = await axios.post(
        "/api/admin/wallet/adjust",
        {
          userId: adjust.partner._id,
          type: adjust.type,
          amount,
          reason: adjustForm.reason.trim(),
        },
        { withCredentials: true }
      );
      toast.success(res.data.message || "Wallet updated");
      setPartners((prev) =>
        prev.map((p) =>
          p._id === adjust.partner._id ? { ...p, balance: res.data.balance } : p
        )
      );
      setAdjust(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not adjust the wallet");
    } finally {
      setAdjusting(false);
    }
  };

  const filteredPartners = useMemo(() => {
    const term = partnerSearch.trim().toLowerCase();
    if (!term) return partners;
    return partners.filter((p) =>
      [p.name, p.companyName, p.email, p.phone, p.memberId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [partners, partnerSearch]);

  const totalHeld = useMemo(
    () => partners.reduce((sum, p) => sum + Number(p.balance || 0), 0),
    [partners]
  );

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad">
          {/* TOP BAR */}
          <nav className="navbar navbar-light bg-light admin-topbar">
            <button
              className="btn btn-outline-primary me-3"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <img src="/assets/images/admin/indent-decrease.svg" alt="Toggle sidebar" />
            </button>
            <span className="navbar-brand mb-0 h5">
              <FaWallet className="me-2" /> Wallet Management
            </span>
          </nav>

          <div className="container-fluid py-4 admin-wallet">
            {/* ── SUMMARY ─────────────────────────────────────────── */}
            <div className="aw-stats">
              <div className="aw-stat">
                <span>Pending Requests</span>
                <strong style={{ color: "#b45309" }}>{counts.pending || 0}</strong>
              </div>
              <div className="aw-stat">
                <span>Approved</span>
                <strong style={{ color: "#047857" }}>{counts.approved || 0}</strong>
              </div>
              <div className="aw-stat">
                <span>Rejected</span>
                <strong style={{ color: "#b91c1c" }}>{counts.rejected || 0}</strong>
              </div>
              <div className="aw-stat">
                <span>Total Wallet Balance</span>
                <strong style={{ color: ACCENT }}>{money(totalHeld)}</strong>
              </div>
            </div>

            {/* ── TABS ────────────────────────────────────────────── */}
            <div className="aw-tabs">
              <button
                type="button"
                className={tab === "requests" ? "active" : ""}
                onClick={() => setTab("requests")}
              >
                Manual Payment Requests
              </button>
              <button
                type="button"
                className={tab === "balances" ? "active" : ""}
                onClick={() => setTab("balances")}
              >
                Partner Balances
              </button>
            </div>

            {/* ══════════ TAB 1 — REQUESTS ══════════ */}
            {tab === "requests" && (
              <div className="aw-card">
                <div className="aw-toolbar">
                  <div className="aw-filters">
                    {["pending", "approved", "rejected", "all"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={statusFilter === s ? "active" : ""}
                        onClick={() => setStatusFilter(s)}
                      >
                        {s === "all" ? "All" : STATUS_STYLE[s].label}
                      </button>
                    ))}
                  </div>

                  <div className="aw-search">
                    <FiSearch />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search partner, reference or request no."
                    />
                  </div>

                  <button
                    type="button"
                    className="aw-refresh"
                    onClick={loadRequests}
                    title="Refresh"
                  >
                    <FiRefreshCw />
                  </button>
                </div>

                <div className="aw-table-scroll">
                  <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          "Request",
                          "Partner",
                          "Amount",
                          "Mode",
                          "Reference",
                          "Paid On",
                          "Proof",
                          "Balance",
                          "Status",
                          "Action",
                        ].map((h) => (
                          <th key={h} style={th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRequests ? (
                        <tr>
                          <td colSpan="10" style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                            Loading…
                          </td>
                        </tr>
                      ) : requests.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                            No requests here.
                          </td>
                        </tr>
                      ) : (
                        requests.map((r) => (
                          <tr key={r._id}>
                            <td style={td}>
                              <div style={{ fontWeight: 700 }}>{r.requestNumber}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {fmtDate(r.createdAt)}
                              </div>
                            </td>
                            <td style={td}>
                              <div style={{ fontWeight: 600 }}>
                                {r.user?.companyName || r.user?.name || "Deleted partner"}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {r.user?.memberId ? `${r.user.memberId} · ` : ""}
                                {r.user?.email || "—"}
                              </div>
                            </td>
                            <td style={{ ...td, fontWeight: 700 }}>{money(r.amount)}</td>
                            <td style={td}>{r.paymentMode}</td>
                            <td style={td}>{r.referenceNumber}</td>
                            <td style={td}>
                              {r.paidAt
                                ? new Date(r.paidAt).toLocaleDateString("en-IN")
                                : "—"}
                            </td>
                            <td style={td}>
                              {r.screenshotUrl ? (
                                <a
                                  href={r.screenshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: ACCENT, fontWeight: 600 }}
                                >
                                  View
                                </a>
                              ) : (
                                <span style={{ color: "#b45309", fontSize: 12 }}>
                                  Not attached
                                </span>
                              )}
                            </td>
                            <td style={td}>{money(r.walletBalance)}</td>
                            <td style={td}>
                              <StatusPill status={r.status} />
                              {r.adminRemarks && (
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    color: "#6b7280",
                                    marginTop: 4,
                                    whiteSpace: "normal",
                                    maxWidth: 200,
                                  }}
                                >
                                  {r.adminRemarks}
                                </div>
                              )}
                            </td>
                            <td style={td}>
                              {r.status === "pending" ? (
                                <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                                  <button
                                    type="button"
                                    className="aw-btn primary"
                                    onClick={() => openReview(r, "approve")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="aw-btn ghost"
                                    onClick={() => openReview(r, "reject")}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: "#6b7280" }}>
                                  {fmtDate(r.reviewedAt)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════ TAB 2 — BALANCES ══════════ */}
            {tab === "balances" && (
              <div className="aw-card">
                <div className="aw-toolbar">
                  <div className="aw-search grow">
                    <FiSearch />
                    <input
                      type="text"
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      placeholder="Search partner by name, company, email or member ID"
                    />
                  </div>
                  <button
                    type="button"
                    className="aw-refresh"
                    onClick={loadPartners}
                    title="Refresh"
                  >
                    <FiRefreshCw />
                  </button>
                </div>

                <div className="aw-table-scroll">
                  <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Member ID", "Partner", "Contact", "Balance", "Last Change", "Action"].map(
                          (h) => (
                            <th key={h} style={th}>
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPartners ? (
                        <tr>
                          <td colSpan="6" style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                            Loading…
                          </td>
                        </tr>
                      ) : filteredPartners.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                            No partners found.
                          </td>
                        </tr>
                      ) : (
                        filteredPartners.map((p) => (
                          <tr key={p._id}>
                            <td style={td}>{p.memberId || "—"}</td>
                            <td style={td}>
                              <div style={{ fontWeight: 600 }}>{p.companyName || p.name}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{p.name}</div>
                            </td>
                            <td style={td}>
                              <div>{p.email || "—"}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{p.phone || "—"}</div>
                            </td>
                            <td style={{ ...td, fontWeight: 700, color: ACCENT }}>
                              {money(p.balance)}
                            </td>
                            <td style={{ ...td, fontSize: 12, color: "#6b7280" }}>
                              {p.updatedAt ? fmtDate(p.updatedAt) : "No activity"}
                            </td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                                <button
                                  type="button"
                                  className="aw-btn primary"
                                  onClick={() => openAdjust(p, "credit")}
                                >
                                  Add Money
                                </button>
                                <button
                                  type="button"
                                  className="aw-btn ghost"
                                  onClick={() => openAdjust(p, "debit")}
                                >
                                  Deduct
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── REVIEW MODAL ──────────────────────────────────────────── */}
      {review && (
        <div className="aw-modal-overlay" onClick={() => !processing && setReview(null)}>
          <div className="aw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aw-modal-head">
              <h5>
                {review.action === "approve" ? "Approve Top-Up" : "Reject Request"}
              </h5>
              <button type="button" onClick={() => setReview(null)} disabled={processing}>
                <FiX />
              </button>
            </div>

            <div className="aw-modal-body">
              <div className="aw-summary">
                <div>
                  <span>Partner</span>
                  <strong>
                    {review.request.user?.companyName || review.request.user?.name || "—"}
                  </strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{money(review.request.amount)}</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>{review.request.paymentMode}</strong>
                </div>
                <div>
                  <span>Reference</span>
                  <strong>{review.request.referenceNumber}</strong>
                </div>
                <div>
                  <span>Current Balance</span>
                  <strong>{money(review.request.walletBalance)}</strong>
                </div>
                <div>
                  <span>Balance After</span>
                  <strong style={{ color: review.action === "approve" ? "#047857" : "#6b7280" }}>
                    {review.action === "approve"
                      ? money(Number(review.request.walletBalance) + Number(review.request.amount))
                      : money(review.request.walletBalance)}
                  </strong>
                </div>
              </div>

              {review.request.note && (
                <p className="aw-note">
                  <strong>Partner&apos;s note:</strong> {review.request.note}
                </p>
              )}

              {review.request.screenshotUrl && (
                <a
                  className="aw-proof"
                  href={review.request.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open payment proof
                </a>
              )}

              <label className="aw-label">
                Remarks {review.action === "reject" && <span style={{ color: "#dc2626" }}>*</span>}
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  review.action === "approve"
                    ? "Optional — visible to the partner"
                    : "Tell the partner what was wrong, e.g. reference not found in our account"
                }
                style={{ resize: "none" }}
              />

              {review.action === "approve" && (
                <p className="aw-warn">
                  Check the amount against your bank statement first. Approving credits the wallet
                  straight away and cannot be undone — it would have to be deducted manually.
                </p>
              )}
            </div>

            <div className="aw-modal-foot">
              <button
                type="button"
                className="aw-btn ghost"
                onClick={() => setReview(null)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="button"
                className={review.action === "approve" ? "aw-btn primary" : "aw-btn danger"}
                onClick={submitReview}
                disabled={processing}
              >
                {processing
                  ? "Working…"
                  : review.action === "approve"
                  ? `Approve & Credit ${money(review.request.amount)}`
                  : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUSTMENT MODAL ──────────────────────────────────────── */}
      {adjust && (
        <div className="aw-modal-overlay" onClick={() => !adjusting && setAdjust(null)}>
          <div className="aw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aw-modal-head">
              <h5>{adjust.type === "credit" ? "Add Money to Wallet" : "Deduct from Wallet"}</h5>
              <button type="button" onClick={() => setAdjust(null)} disabled={adjusting}>
                <FiX />
              </button>
            </div>

            <div className="aw-modal-body">
              <div className="aw-summary">
                <div>
                  <span>Partner</span>
                  <strong>{adjust.partner.companyName || adjust.partner.name}</strong>
                </div>
                <div>
                  <span>Current Balance</span>
                  <strong>{money(adjust.partner.balance)}</strong>
                </div>
              </div>

              <label className="aw-label">Amount *</label>
              <input
                type="number"
                min="1"
                value={adjustForm.amount}
                onChange={(e) =>
                  setAdjustForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="e.g. 5000"
              />

              <label className="aw-label">Reason *</label>
              <textarea
                rows={3}
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder={
                  adjust.type === "credit"
                    ? "e.g. cash received at office, settlement of order #1234"
                    : "e.g. duplicate credit reversed, cheque bounced"
                }
                style={{ resize: "none" }}
              />
              <p className="aw-warn">
                This shows on the partner&apos;s statement and in the activity log.
                {adjust.type === "debit" &&
                  " A deduction is refused if the balance does not cover it."}
              </p>
            </div>

            <div className="aw-modal-foot">
              <button
                type="button"
                className="aw-btn ghost"
                onClick={() => setAdjust(null)}
                disabled={adjusting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={adjust.type === "credit" ? "aw-btn primary" : "aw-btn danger"}
                onClick={submitAdjust}
                disabled={adjusting}
              >
                {adjusting
                  ? "Working…"
                  : adjust.type === "credit"
                  ? "Add to Wallet"
                  : "Deduct from Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .admin-wallet .aw-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .admin-wallet .aw-stat {
          background: #fff;
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .admin-wallet .aw-stat span {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .admin-wallet .aw-stat strong {
          font-size: 22px;
        }
        .admin-wallet .aw-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .admin-wallet .aw-tabs button {
          border: 1px solid #e7e7e7;
          background: #fff;
          color: #4b5563;
          border-radius: 10px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-wallet .aw-tabs button.active {
          background: #1A71F6;
          border-color: #1A71F6;
          color: #fff;
        }
        .admin-wallet .aw-card {
          background: #fff;
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          overflow: hidden;
        }
        .admin-wallet .aw-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid #f1f2f4;
        }
        .admin-wallet .aw-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-wallet .aw-filters button {
          border: 1px solid #e7e7e7;
          background: #fff;
          color: #6b7280;
          border-radius: 999px;
          padding: 6px 15px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-wallet .aw-filters button.active {
          background: #0d0d0d;
          border-color: #0d0d0d;
          color: #fff;
        }
        .admin-wallet .aw-search {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e7e7e7;
          border-radius: 10px;
          padding: 8px 12px;
          color: #6b7280;
          flex: 1 1 280px;
          max-width: 420px;
        }
        .admin-wallet .aw-search.grow {
          max-width: none;
        }
        .admin-wallet .aw-search input {
          border: none;
          outline: none;
          font-size: 13.5px;
          width: 100%;
          color: #0d0d0d;
        }
        .admin-wallet .aw-refresh {
          border: 1px solid #e7e7e7;
          background: #fff;
          color: #6b7280;
          border-radius: 10px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .admin-wallet .aw-refresh:hover {
          color: #1A71F6;
          border-color: #1A71F6;
        }
        .admin-wallet .aw-table-scroll {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #d6d9e0 transparent;
        }
        .admin-wallet .aw-table-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .admin-wallet .aw-table-scroll::-webkit-scrollbar-thumb {
          background: #d6d9e0;
          border-radius: 999px;
        }
        .admin-wallet .aw-table-scroll tbody tr:hover {
          background: #f8f9fc;
        }
        .admin-wallet .aw-btn,
        .aw-modal .aw-btn {
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .admin-wallet .aw-btn.primary,
        .aw-modal .aw-btn.primary {
          background: #1A71F6;
          border: 1px solid #1A71F6;
          color: #fff;
        }
        .admin-wallet .aw-btn.ghost,
        .aw-modal .aw-btn.ghost {
          background: #fff;
          border: 1px solid #0d0d0d;
          color: #0d0d0d;
        }
        .admin-wallet .aw-btn.danger,
        .aw-modal .aw-btn.danger {
          background: #b91c1c;
          border: 1px solid #b91c1c;
          color: #fff;
        }
        .admin-wallet .aw-btn:disabled,
        .aw-modal .aw-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .aw-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1500;
          background: rgba(17, 17, 17, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }
        .aw-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .aw-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e7e7e7;
        }
        .aw-modal-head h5 {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: #0d0d0d;
        }
        .aw-modal-head button {
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 20px;
          cursor: pointer;
          display: flex;
        }
        .aw-modal-body {
          padding: 18px 20px;
          overflow-y: auto;
        }
        .aw-modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid #e7e7e7;
          background: #f8f9fc;
        }
        .aw-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          background: #f8f9fc;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 16px;
        }
        .aw-summary > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .aw-summary span {
          font-size: 11.5px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .aw-summary strong {
          font-size: 14.5px;
          color: #0d0d0d;
        }
        .aw-note {
          font-size: 13.5px;
          color: #4b5563;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 10px 14px;
        }
        .aw-proof {
          display: inline-block;
          margin-bottom: 14px;
          color: #1A71F6;
          font-weight: 600;
          font-size: 13.5px;
        }
        .aw-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0d0d0d;
          margin-bottom: 6px;
        }
        .aw-modal-body input,
        .aw-modal-body textarea {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13.5px;
          margin-bottom: 14px;
          outline: none;
        }
        .aw-modal-body input:focus,
        .aw-modal-body textarea:focus {
          border-color: #1A71F6;
        }
        .aw-warn {
          font-size: 12.5px;
          color: #6b7280;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
