"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import AdminTopbar from "@/components/admin-panel/AdminTopbar";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiTrash2,
  FiMail,
  FiPhone,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
} from "react-icons/fi";
import {
  LEAD_STATUSES,
  DEFAULT_LEAD_STATUS,
  leadStatusStyle,
} from "@/config/leadStatuses";

const ITEMS_PER_PAGE = 10;

// A lead saved before stages existed has no status of its own
const statusOf = (lead) => lead.status || DEFAULT_LEAD_STATUS;

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// A cell beginning with =, +, - or @ is prefixed so Excel reads it as text
const csvCell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function AdminLeads() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingId, setSavingId] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchLeads = async () => {
    try {
      const res = await axios.get("/api/contact/list", { withCredentials: true });
      setLeads(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const deleteLead = async (id) => {
    if (!confirm("Delete this contact?")) return;

    try {
      await axios.delete(`/api/contact/delete/${id}`, { withCredentials: true });
      toast.success("Contact deleted");
      setLeads((list) => list.filter((l) => l._id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete contact");
    }
  };

  // The row updates as soon as the server confirms, so no full reload is needed
  const updateLead = async (id, payload, successMessage) => {
    try {
      setSavingId(id);
      const res = await axios.patch(`/api/contact/status/${id}`, payload, {
        withCredentials: true,
      });
      setLeads((list) => list.map((l) => (l._id === id ? res.data.data : l)));
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Could not update the contact");
    } finally {
      setSavingId(null);
    }
  };

  const openDetail = (lead) => {
    if (expandedId === lead._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(lead._id);
    setNoteDraft(lead.note || "");
  };

  // Counts stay on every stage chip, so an empty stage is still visible
  const counts = useMemo(() => {
    const map = { All: leads.length };
    LEAD_STATUSES.forEach((s) => (map[s] = 0));
    leads.forEach((lead) => {
      const s = statusOf(lead);
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leads
      .filter((lead) => statusFilter === "All" || statusOf(lead) === statusFilter)
      .filter((lead) => {
        if (!term) return true;
        const text = [
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.phone,
          lead.message,
          lead.note,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(term);
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt)
      );
  }, [leads, search, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE) || 1;
  const page = Math.min(currentPage, totalPages);
  const currentLeads = filteredLeads.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Exports exactly what the filters above have left on screen
  const exportLeads = () => {
    if (!filteredLeads.length) return;

    const header = ["Name", "Email", "Phone", "Status", "Message", "Note", "Received"];
    const rows = filteredLeads.map((lead) =>
      [
        `${lead.firstName} ${lead.lastName}`,
        lead.email,
        lead.phone,
        statusOf(lead),
        lead.message || "",
        lead.note || "",
        formatDate(lead.createdAt),
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = `﻿${header.join(",")}\n${rows.join("\n")}\n`;
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <AdminTopbar onToggleSidebar={toggleSidebar} />

        <div className="container-fluid p-4">
          <div style={headerRow}>
            <div>
              <h1 className="dashboard-main-h" style={{ marginBottom: 4 }}>
                Contacts
              </h1>
              <p style={subText}>
                {loading
                  ? "Loading contacts..."
                  : `${filteredLeads.length} of ${leads.length} contact${
                      leads.length === 1 ? "" : "s"
                    } shown`}
              </p>
            </div>

            <button
              onClick={exportLeads}
              disabled={loading || filteredLeads.length === 0}
              style={{
                ...ghostBtn,
                cursor:
                  loading || filteredLeads.length === 0 ? "not-allowed" : "pointer",
                opacity: loading || filteredLeads.length === 0 ? 0.6 : 1,
              }}
            >
              <FiDownload size={14} /> Export
            </button>
          </div>

          {/* ── Stage filter ── */}
          <div style={chipRow}>
            {["All", ...LEAD_STATUSES].map((stage) => {
              const active = statusFilter === stage;
              const tone = stage === "All" ? null : leadStatusStyle(stage);
              return (
                <button
                  key={stage}
                  onClick={() => {
                    setStatusFilter(stage);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...chipStyle,
                    background: active ? "#111" : tone ? tone.bg : "#fff",
                    color: active ? "#fff" : tone ? tone.color : "#374151",
                    borderColor: active ? "#111" : tone ? tone.border : "#e5e7eb",
                  }}
                >
                  {stage}
                  <span style={{ ...chipCount, opacity: active ? 0.85 : 0.6 }}>
                    {counts[stage] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Search and sort ── */}
          <div style={toolbarRow}>
            <div style={searchWrap}>
              <FiSearch size={15} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by name, email, phone, message"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={searchInput}
              />
            </div>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              style={selectStyle}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* ── Leads ── */}
          <div style={tableCard}>
            <div className="table-responsive">
              <table className="table align-middle" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Contact</th>
                    <th style={thStyle}>Message</th>
                    <th style={{ ...thStyle, width: 180 }}>Status</th>
                    <th style={{ ...thStyle, width: 170 }}>Received</th>
                    <th style={{ ...thStyle, width: 90 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={emptyCell}>
                        Loading...
                      </td>
                    </tr>
                  ) : currentLeads.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={emptyCell}>
                        {leads.length === 0
                          ? "No contact requests have come in yet."
                          : "No contacts match these filters."}
                      </td>
                    </tr>
                  ) : (
                    currentLeads.map((lead) => {
                      const tone = leadStatusStyle(statusOf(lead));
                      const open = expandedId === lead._id;

                      return (
                        <Fragment key={lead._id}>
                          <tr style={{ borderTop: "1px solid #f1f2f4" }}>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 700, color: "#111" }}>
                                {lead.firstName} {lead.lastName}
                              </div>
                              <a href={`mailto:${lead.email}`} style={linkStyle}>
                                <FiMail size={11} /> {lead.email}
                              </a>
                              <a href={`tel:${lead.phone}`} style={linkStyle}>
                                <FiPhone size={11} /> {lead.phone}
                              </a>
                            </td>

                            <td style={tdStyle}>
                              <button onClick={() => openDetail(lead)} style={messageBtn}>
                                <span style={open ? undefined : clampedText}>
                                  {lead.message || "No message"}
                                </span>
                                <span style={moreLabel}>
                                  {open ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                                  {open ? "Less" : "Details"}
                                </span>
                              </button>
                              {lead.note && !open && (
                                <div style={notePreview}>Note: {lead.note}</div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              <select
                                value={statusOf(lead)}
                                disabled={savingId === lead._id}
                                onChange={(e) =>
                                  updateLead(
                                    lead._id,
                                    { status: e.target.value },
                                    `Moved to ${e.target.value}`
                                  )
                                }
                                style={{
                                  ...statusSelect,
                                  color: tone.color,
                                  background: tone.bg,
                                  borderColor: tone.border,
                                }}
                              >
                                {LEAD_STATUSES.map((s) => (
                                  <option key={s} value={s} style={{ color: "#111" }}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {lead.statusUpdatedAt && (
                                <div style={stampText}>
                                  Updated {formatDate(lead.statusUpdatedAt)}
                                </div>
                              )}
                            </td>

                            <td style={{ ...tdStyle, fontSize: 12.5, color: "#6b7280" }}>
                              {formatDate(lead.createdAt)}
                            </td>

                            <td style={tdStyle}>
                              <button
                                onClick={() => deleteLead(lead._id)}
                                style={deleteBtn}
                                title="Delete contact"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </td>
                          </tr>

                          {open && (
                            <tr>
                              <td colSpan="5" style={detailCell}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                                  FULL MESSAGE
                                </div>
                                <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#374151", whiteSpace: "pre-wrap" }}>
                                  {lead.message || "No message"}
                                </p>

                                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                                  INTERNAL NOTE
                                </div>
                                <textarea
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  rows={2}
                                  maxLength={500}
                                  placeholder="What was discussed, what is pending, who is following up"
                                  style={noteInput}
                                />
                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                  <button
                                    onClick={() =>
                                      updateLead(lead._id, { note: noteDraft }, "Note saved")
                                    }
                                    disabled={savingId === lead._id}
                                    style={saveBtn}
                                  >
                                    {savingId === lead._id ? "Saving..." : "Save note"}
                                  </button>
                                  <button onClick={() => setExpandedId(null)} style={ghostBtn}>
                                    Close
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setCurrentPage(page - 1)}
                  disabled={page === 1}
                  style={{ ...pageBtn, opacity: page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{
                      ...pageBtn,
                      background: page === i + 1 ? "#111" : "#fff",
                      color: page === i + 1 ? "#fff" : "#374151",
                      borderColor: page === i + 1 ? "#111" : "#e5e7eb",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(page + 1)}
                  disabled={page === totalPages}
                  style={{ ...pageBtn, opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const subText = { margin: 0, fontSize: 13, color: "#6b7280" };

const chipRow = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 };

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: 999,
  border: "1.5px solid",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const chipCount = { fontSize: 11.5, fontWeight: 700 };

const toolbarRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
};

const searchWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#fff",
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  padding: "0 12px",
  height: 42,
  flex: "1 1 280px",
  maxWidth: 420,
};

const searchInput = {
  border: "none",
  outline: "none",
  fontSize: 13.5,
  width: "100%",
  background: "transparent",
};

const selectStyle = {
  height: 42,
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  background: "#fff",
  padding: "0 12px",
  fontSize: 13.5,
  fontWeight: 600,
  color: "#374151",
  cursor: "pointer",
};

const tableCard = {
  background: "#fff",
  border: "1px solid #eceef1",
  borderRadius: 14,
  overflow: "hidden",
};

const thStyle = {
  background: "#fafbfc",
  borderBottom: "1px solid #eceef1",
  color: "#6b7280",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  padding: "14px 16px",
};

const tdStyle = { padding: "14px 16px", verticalAlign: "top", border: "none" };

const emptyCell = {
  textAlign: "center",
  color: "#9ca3af",
  fontSize: 13.5,
  padding: "40px 16px",
  border: "none",
};

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12.5,
  color: "#6b7280",
  textDecoration: "none",
  marginTop: 3,
};

const messageBtn = {
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  fontSize: 13.5,
  color: "#374151",
  cursor: "pointer",
  maxWidth: 460,
};

const clampedText = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const moreLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginTop: 5,
  fontSize: 12,
  fontWeight: 700,
  color: "#1A71F6",
};

const notePreview = {
  marginTop: 6,
  fontSize: 12,
  color: "#92400e",
  background: "#fff7e6",
  border: "1px solid #fde3b0",
  borderRadius: 8,
  padding: "5px 9px",
  maxWidth: 460,
};

const statusSelect = {
  width: "100%",
  maxWidth: 160,
  height: 34,
  borderRadius: 8,
  border: "1.5px solid",
  padding: "0 8px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const stampText = { marginTop: 5, fontSize: 11, color: "#9ca3af" };

const deleteBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1.5px solid #fca5a5",
  background: "#fff",
  color: "#b91c1c",
  cursor: "pointer",
};

const detailCell = {
  background: "#fafbfc",
  borderTop: "1px solid #f1f2f4",
  padding: "16px 18px 20px",
};

const noteInput = {
  width: "100%",
  maxWidth: 620,
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  padding: "10px 12px",
  fontSize: 13.5,
  outline: "none",
  resize: "vertical",
};

const saveBtn = {
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#fff",
  color: "#374151",
  border: "1.5px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const pageBtn = {
  minWidth: 38,
  height: 36,
  borderRadius: 8,
  border: "1.5px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "0 12px",
};
