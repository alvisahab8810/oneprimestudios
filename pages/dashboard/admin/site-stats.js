"use client";

// Admin → Site Stats: manages the figures in the strip above the product
// listing ("Partners Registered with Us (India)  382  Growing steadily...").
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiBarChart2 } from "react-icons/fi";
import { computeStatValue } from "@/lib/siteStats";

const EMPTY_FORM = {
  label: "",
  value: "",
  note: "",
  prefix: "",
  suffix: "",
  order: 0,
  isActive: true,
  autoGrowEnabled: false,
  autoGrowPerDay: 1,
  autoGrowStartDate: "",
};

// A Date from the API as the yyyy-mm-dd a date input expects
const toDateInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toISOString().slice(0, 10);
};

export default function SiteStatsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/site-stats", { withCredentials: true });
      setStats(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (stat) => {
    setEditingId(stat._id);
    setForm({
      label: stat.label || "",
      value: String(stat.value ?? ""),
      note: stat.note || "",
      prefix: stat.prefix || "",
      suffix: stat.suffix || "",
      order: stat.order ?? 0,
      isActive: stat.isActive !== false,
      autoGrowEnabled: !!stat.autoGrow?.enabled,
      autoGrowPerDay: stat.autoGrow?.perDay ?? 1,
      autoGrowStartDate: toDateInput(stat.autoGrow?.startDate),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.label.trim()) return toast.error("Label is required");
    if (String(form.value).trim() === "" || Number(form.value) < 0) {
      return toast.error("Enter a value of 0 or more");
    }
    if (form.autoGrowEnabled && !form.autoGrowStartDate) {
      return toast.error("Pick a start date for automatic growth");
    }

    const payload = {
      label: form.label,
      value: form.value,
      note: form.note,
      prefix: form.prefix,
      suffix: form.suffix,
      order: form.order,
      isActive: form.isActive,
      autoGrow: {
        enabled: form.autoGrowEnabled,
        perDay: form.autoGrowPerDay,
        startDate: form.autoGrowStartDate || null,
      },
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/api/admin/site-stats/${editingId}`, payload, { withCredentials: true });
        toast.success("Stat updated");
      } else {
        await axios.post("/api/admin/site-stats", payload, { withCredentials: true });
        toast.success("Stat added");
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stat) => {
    if (!window.confirm(`Delete "${stat.label}"? This removes it from the storefront.`)) return;
    try {
      await axios.delete(`/api/admin/site-stats/${stat._id}`, { withCredentials: true });
      toast.success("Stat deleted");
      setStats((prev) => prev.filter((s) => s._id !== stat._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete");
    }
  };

  const toggleActive = async (stat) => {
    try {
      await axios.put(
        `/api/admin/site-stats/${stat._id}`,
        { ...stat, isActive: !stat.isActive },
        { withCredentials: true }
      );
      setStats((prev) =>
        prev.map((s) => (s._id === stat._id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update");
    }
  };

  // What the strip prints today, so the admin can check the growth settings
  const livePreview = (stat) =>
    `${stat.prefix || ""}${computeStatValue(stat).toLocaleString("en-IN")}${stat.suffix || ""}`;

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad">
          {/* TOP BAR */}
          <nav className="navbar navbar-light bg-light admin-topbar">
            <button className="btn btn-outline-primary me-3" onClick={() => setSidebarOpen((o) => !o)}>
              <img src="/assets/images/admin/indent-decrease.svg" alt="Toggle sidebar" />
            </button>
            <span className="navbar-brand mb-0 h5">
              <FiBarChart2 className="me-2" /> Site Stats
            </span>
          </nav>

          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-1">Stats strip</h5>
                <p className="text-muted small mb-0">
                  This figure appears in the strip above the product listing. The strip holds one
                  stat — edit it below, or delete it to start a new one.
                </p>
              </div>
              {stats.length === 0 && !showForm && (
                <button className="btn btn-primary" onClick={openAdd}>
                  <FiPlus className="me-1" /> Add Stat
                </button>
              )}
            </div>

            {/* ── FORM ───────────────────────────────────────────────── */}
            {showForm && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">{editingId ? "Edit stat" : "New stat"}</h6>
                    <button type="button" className="btn btn-sm btn-light" onClick={closeForm}>
                      <FiX />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-5">
                        <label className="form-label">Label *</label>
                        <input
                          name="label"
                          value={form.label}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="Partners Registered with Us (India)"
                        />
                        <div className="form-text">Text shown before the number</div>
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Value *</label>
                        <input
                          name="value"
                          value={form.value}
                          onChange={handleChange}
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="382"
                        />
                      </div>

                      <div className="col-md-5">
                        <label className="form-label">Note</label>
                        <input
                          name="note"
                          value={form.note}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="Growing steadily across India"
                        />
                        <div className="form-text">Text shown after the number</div>
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Prefix</label>
                        <input
                          name="prefix"
                          value={form.prefix}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="e.g. Rs"
                        />
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Suffix</label>
                        <input
                          name="suffix"
                          value={form.suffix}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="e.g. +"
                        />
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Order</label>
                        <input
                          name="order"
                          value={form.order}
                          onChange={handleChange}
                          type="number"
                          className="form-control"
                        />
                      </div>

                      <div className="col-md-6 d-flex align-items-end">
                        <div className="form-check">
                          <input
                            id="isActive"
                            name="isActive"
                            checked={form.isActive}
                            onChange={handleChange}
                            type="checkbox"
                            className="form-check-input"
                          />
                          <label className="form-check-label" htmlFor="isActive">
                            Show on the website
                          </label>
                        </div>
                      </div>

                      {/* Automatic growth */}
                      <div className="col-12">
                        <div className="border rounded p-3 bg-light">
                          <div className="form-check mb-2">
                            <input
                              id="autoGrowEnabled"
                              name="autoGrowEnabled"
                              checked={form.autoGrowEnabled}
                              onChange={handleChange}
                              type="checkbox"
                              className="form-check-input"
                            />
                            <label className="form-check-label fw-semibold" htmlFor="autoGrowEnabled">
                              Grow this number automatically
                            </label>
                          </div>
                          <div className="small text-muted mb-3">
                            The number climbs on its own from the start date, so the strip never
                            looks frozen. Everyone sees the same figure on the same day. Leave this
                            off to show the value exactly as typed.
                          </div>

                          {form.autoGrowEnabled && (
                            <div className="row g-3">
                              <div className="col-md-3">
                                <label className="form-label">Add per day</label>
                                <input
                                  name="autoGrowPerDay"
                                  value={form.autoGrowPerDay}
                                  onChange={handleChange}
                                  type="number"
                                  className="form-control"
                                />
                              </div>
                              <div className="col-md-3">
                                <label className="form-label">Counting from</label>
                                <input
                                  name="autoGrowStartDate"
                                  value={form.autoGrowStartDate}
                                  onChange={handleChange}
                                  type="date"
                                  className="form-control"
                                />
                              </div>
                              <div className="col-md-6 d-flex align-items-end">
                                <div className="small text-muted">
                                  Shows today as{" "}
                                  <strong>
                                    {computeStatValue({
                                      value: Number(form.value) || 0,
                                      autoGrow: {
                                        enabled: true,
                                        perDay: Number(form.autoGrowPerDay) || 0,
                                        startDate: form.autoGrowStartDate || null,
                                      },
                                    }).toLocaleString("en-IN")}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Update Stat" : "Add Stat"}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── LIST ───────────────────────────────────────────────── */}
            <div className="card">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Order</th>
                      <th>Label</th>
                      <th>Shows as</th>
                      <th>Note</th>
                      <th>Growth</th>
                      <th>Visible</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5">
                          <div className="spinner-border text-primary" role="status" />
                        </td>
                      </tr>
                    ) : stats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          No stats yet. Add one and it appears in the strip on the products page.
                        </td>
                      </tr>
                    ) : (
                      stats.map((stat) => (
                        <tr key={stat._id}>
                          <td>{stat.order ?? 0}</td>
                          <td className="fw-semibold">{stat.label}</td>
                          <td>{livePreview(stat)}</td>
                          <td className="text-muted">{stat.note || "—"}</td>
                          <td>
                            {stat.autoGrow?.enabled ? (
                              <span className="badge bg-info text-dark">
                                +{stat.autoGrow.perDay}/day
                              </span>
                            ) : (
                              <span className="text-muted">Fixed</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                stat.isActive ? "btn-success" : "btn-outline-secondary"
                              }`}
                              onClick={() => toggleActive(stat)}
                            >
                              {stat.isActive ? "Visible" : "Hidden"}
                            </button>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => openEdit(stat)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(stat)}
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
