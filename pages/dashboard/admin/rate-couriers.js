"use client";

// Admin → Rate List Couriers: the couriers a partner picks on the rate list,
// and what each one adds to the quoted price.
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTruck } from "react-icons/fi";
import { courierCharge } from "@/lib/rateList";

const EMPTY_FORM = {
  name: "",
  baseCharge: "0",
  perKg: "0",
  order: 0,
  isActive: true,
};

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function RateCouriersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/rate-couriers", { withCredentials: true });
      setCouriers(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load couriers");
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

  const openEdit = (courier) => {
    setEditingId(courier._id);
    setForm({
      name: courier.name || "",
      baseCharge: String(courier.baseCharge ?? 0),
      perKg: String(courier.perKg ?? 0),
      order: courier.order ?? 0,
      isActive: courier.isActive !== false,
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

    if (!form.name.trim()) return toast.error("Courier name is required");
    if (Number(form.baseCharge) < 0 || Number(form.perKg) < 0) {
      return toast.error("Charges cannot be negative");
    }

    const payload = {
      name: form.name,
      baseCharge: Number(form.baseCharge) || 0,
      perKg: Number(form.perKg) || 0,
      order: Number(form.order) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/api/admin/rate-couriers/${editingId}`, payload, { withCredentials: true });
        toast.success("Courier updated");
      } else {
        await axios.post("/api/admin/rate-couriers", payload, { withCredentials: true });
        toast.success("Courier added");
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courier) => {
    if (!window.confirm(`Delete "${courier.name}"? Partners will no longer be able to pick it.`)) {
      return;
    }
    try {
      await axios.delete(`/api/admin/rate-couriers/${courier._id}`, { withCredentials: true });
      toast.success("Courier deleted");
      setCouriers((prev) => prev.filter((c) => c._id !== courier._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete");
    }
  };

  const toggleActive = async (courier) => {
    try {
      await axios.put(
        `/api/admin/rate-couriers/${courier._id}`,
        { ...courier, isActive: !courier.isActive },
        { withCredentials: true }
      );
      setCouriers((prev) =>
        prev.map((c) => (c._id === courier._id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update");
    }
  };

  // A worked example, so the charge model is obvious without doing the sums
  const previewCourier = {
    baseCharge: Number(form.baseCharge) || 0,
    perKg: Number(form.perKg) || 0,
  };

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
              <FiTruck className="me-2" /> Rate List Couriers
            </span>
          </nav>

          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-1">Standby couriers</h5>
                <p className="text-muted small mb-0">
                  The rate list normally quotes live Shiprocket couriers for the partner&apos;s
                  delivery pincode. These saved couriers are the standby: partners only see them
                  when Shiprocket cannot answer. The charge below is added to every quoted price.
                </p>
              </div>
              {!showForm && (
                <button className="btn btn-primary" onClick={openAdd}>
                  <FiPlus className="me-1" /> Add Courier
                </button>
              )}
            </div>

            {/* ── FORM ───────────────────────────────────────────────── */}
            {showForm && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">{editingId ? "Edit courier" : "New courier"}</h6>
                    <button type="button" className="btn btn-sm btn-light" onClick={closeForm}>
                      <FiX />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-5">
                        <label className="form-label">Courier name *</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="DTDC Surface - North Zone"
                        />
                        <div className="form-text">Shown in the partner&apos;s dropdown</div>
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Base charge (₹)</label>
                        <input
                          name="baseCharge"
                          value={form.baseCharge}
                          onChange={handleChange}
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                        />
                        <div className="form-text">Added once per rate</div>
                      </div>

                      <div className="col-md-2">
                        <label className="form-label">Per kg (₹)</label>
                        <input
                          name="perKg"
                          value={form.perKg}
                          onChange={handleChange}
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                        />
                        <div className="form-text">Part kilos count as one</div>
                      </div>

                      <div className="col-md-1">
                        <label className="form-label">Order</label>
                        <input
                          name="order"
                          value={form.order}
                          onChange={handleChange}
                          type="number"
                          className="form-control"
                        />
                      </div>

                      <div className="col-md-2 d-flex align-items-end">
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
                            Offer to partners
                          </label>
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="border rounded p-3 bg-light small text-muted">
                          A 2.4 kg shipment is charged{" "}
                          <strong>{money(courierCharge(previewCourier, 2.4))}</strong>, a 10 kg one{" "}
                          <strong>{money(courierCharge(previewCourier, 10))}</strong>. Weight comes
                          from the product&apos;s shipping weight multiplied by the quantity, so set
                          that on every product you want quoted accurately.
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Update Courier" : "Add Courier"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={closeForm}
                      >
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
                      <th>Courier</th>
                      <th>Base charge</th>
                      <th>Per kg</th>
                      <th>5 kg costs</th>
                      <th>Offered</th>
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
                    ) : couriers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          No standby couriers yet. Add one so the rate list still works when
                          live rates are unavailable.
                        </td>
                      </tr>
                    ) : (
                      couriers.map((courier) => (
                        <tr key={courier._id}>
                          <td>{courier.order ?? 0}</td>
                          <td className="fw-semibold">{courier.name}</td>
                          <td>{money(courier.baseCharge)}</td>
                          <td>{money(courier.perKg)}</td>
                          <td>{money(courierCharge(courier, 5))}</td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                courier.isActive ? "btn-success" : "btn-outline-secondary"
                              }`}
                              onClick={() => toggleActive(courier)}
                            >
                              {courier.isActive ? "Offered" : "Hidden"}
                            </button>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => openEdit(courier)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(courier)}
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
