"use client";

// Shipment panel on the admin order page: compare courier rates, book the parcel,
// then track it, print the label or cancel it.
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaTruck, FaSyncAlt, FaFilePdf, FaTimesCircle, FaSearchDollar } from "react-icons/fa";

const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN") : "—");

export default function ShipmentPanel({ order, onOrderChange }) {
  const shipment = order?.shipment || {};
  const booked = !!shipment.awbCode;

  const [pkg, setPkg] = useState({ weight: "", length: "", breadth: "", height: "" });
  const [suggested, setSuggested] = useState(null);
  const [problems, setProblems] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState("");
  const [schedulePickup, setSchedulePickup] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [busy, setBusy] = useState("");

  const setPkgField = (field) => (e) => setPkg((prev) => ({ ...prev, [field]: e.target.value }));

  const loadRates = async () => {
    try {
      setLoadingRates(true);
      const res = await axios.get("/api/admin/shipments/rates", {
        params: { orderId: order._id, ...pkg },
        withCredentials: true,
      });
      const data = res.data || {};
      setSuggested(data.suggested || null);
      setProblems(data.problems || []);
      setCouriers(data.couriers || []);
      if (data.pkg) {
        setPkg({
          weight: String(data.pkg.weight ?? ""),
          length: String(data.pkg.length ?? ""),
          breadth: String(data.pkg.breadth ?? ""),
          height: String(data.pkg.height ?? ""),
        });
      }
      const recommended = (data.couriers || []).find((c) => c.recommended) || (data.couriers || [])[0];
      setCourierId(recommended ? recommended.courierId : "");
      if (!(data.couriers || []).length && !(data.problems || []).length) {
        toast.error("No courier is available for this pincode");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load courier rates");
    } finally {
      setLoadingRates(false);
    }
  };

  const createShipment = async () => {
    if (!courierId) { toast.error("Select a courier first"); return; }
    try {
      setBusy("create");
      const res = await axios.post("/api/admin/shipments/create",
        { orderId: order._id, courierId, ...pkg, schedulePickup },
        { withCredentials: true });
      toast.success("Shipment booked");
      onOrderChange({ ...order, shipment: res.data.shipment, status: res.data.status, dispatchRequest: "approved" });
      setCouriers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not book the shipment");
    } finally {
      setBusy("");
    }
  };

  const refreshTracking = async () => {
    try {
      setBusy("track");
      const res = await axios.post("/api/admin/shipments/track", { orderId: order._id }, { withCredentials: true });
      onOrderChange({ ...order, shipment: res.data.shipment, status: res.data.status });
      toast.success("Tracking updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch tracking");
    } finally {
      setBusy("");
    }
  };

  const openDocument = async (type) => {
    const existing = type === "manifest" ? shipment.manifestUrl : shipment.labelUrl;
    if (existing) { window.open(existing, "_blank", "noreferrer"); return; }
    try {
      setBusy(type);
      const res = await axios.post("/api/admin/shipments/label", { orderId: order._id, type }, { withCredentials: true });
      onOrderChange({ ...order, shipment: res.data.shipment });
      if (res.data.url) window.open(res.data.url, "_blank", "noreferrer");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate the document");
    } finally {
      setBusy("");
    }
  };

  const cancelShipment = async () => {
    if (!window.confirm("Cancel this shipment with the courier?")) return;
    try {
      setBusy("cancel");
      const res = await axios.post("/api/admin/shipments/cancel", { orderId: order._id }, { withCredentials: true });
      onOrderChange({ ...order, shipment: res.data.shipment });
      toast.success("Shipment cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel the shipment");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="card mt-4 border shadow-sm">
      <div className="card-body">
        <h6 className="fw-semibold mb-3">
          <FaTruck className="me-2 text-primary" />Courier Shipment
        </h6>

        {booked ? (
          <>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <div className="text-muted small">Courier</div>
                <div className="fw-semibold">{shipment.courierName || "—"}</div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">AWB</div>
                <div className="fw-semibold">{shipment.awbCode}</div>
              </div>
              <div className="col-md-2">
                <div className="text-muted small">Freight</div>
                <div className="fw-semibold">₹{Number(shipment.freightCharge || 0).toFixed(2)}</div>
              </div>
              <div className="col-md-2">
                <div className="text-muted small">Applied weight</div>
                <div className="fw-semibold">{shipment.appliedWeight || "—"} kg</div>
              </div>
              <div className="col-md-2">
                <div className="text-muted small">Expected delivery</div>
                <div className="fw-semibold">
                  {shipment.expectedDeliveryDate ? new Date(shipment.expectedDeliveryDate).toLocaleDateString("en-IN") : "—"}
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <button className="btn btn-outline-primary btn-sm" onClick={refreshTracking} disabled={busy === "track"}>
                <FaSyncAlt className="me-2" />{busy === "track" ? "Refreshing..." : "Refresh tracking"}
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => openDocument("label")} disabled={busy === "label"}>
                <FaFilePdf className="me-2" />Shipping label
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => openDocument("manifest")} disabled={busy === "manifest"}>
                <FaFilePdf className="me-2" />Manifest
              </button>
              {shipment.trackingUrl && (
                <a className="btn btn-outline-secondary btn-sm" href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                  Open tracking page
                </a>
              )}
              <button className="btn btn-outline-danger btn-sm ms-auto" onClick={cancelShipment} disabled={busy === "cancel"}>
                <FaTimesCircle className="me-2" />{busy === "cancel" ? "Cancelling..." : "Cancel shipment"}
              </button>
            </div>

            <div className="alert alert-light border py-2 px-3 mb-3" style={{ fontSize: 13 }}>
              <strong>Status:</strong> {shipment.status || "Booked"}
              <span className="text-muted ms-2">Last checked: {fmtDate(shipment.lastTrackedAt)}</span>
              {shipment.pickupScheduledAt && (
                <span className="text-muted ms-2">Pickup requested: {fmtDate(shipment.pickupScheduledAt)}</span>
              )}
            </div>

            {shipment.trackingHistory?.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Date</th><th>Status</th><th>Activity</th><th>Location</th></tr>
                  </thead>
                  <tbody>
                    {[...shipment.trackingHistory].reverse().map((t, i) => (
                      <tr key={`${t.date || i}-${i}`}>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                        <td>{t.status || "—"}</td>
                        <td>{t.activity || "—"}</td>
                        <td>{t.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-muted small mb-3">
              Package details come from the products in this order. Check them before booking.
            </p>

            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">Weight (kg)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={pkg.weight} onChange={setPkgField("weight")} placeholder="Auto" />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">Length (cm)</label>
                <input type="number" step="0.1" min="0" className="form-control" value={pkg.length} onChange={setPkgField("length")} placeholder="Auto" />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">Breadth (cm)</label>
                <input type="number" step="0.1" min="0" className="form-control" value={pkg.breadth} onChange={setPkgField("breadth")} placeholder="Auto" />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1">Height (cm)</label>
                <input type="number" step="0.1" min="0" className="form-control" value={pkg.height} onChange={setPkgField("height")} placeholder="Auto" />
              </div>
            </div>

            {suggested && !suggested.fromProducts && (
              <div className="alert alert-warning py-2 px-3" style={{ fontSize: 13 }}>
                These products have no weight saved, so a default package size is being used. Add weight and size on the product to get exact rates.
              </div>
            )}

            {problems.length > 0 && (
              <div className="alert alert-danger py-2 px-3" style={{ fontSize: 13 }}>
                Missing before booking: {problems.join(", ")}
              </div>
            )}

            <button className="btn btn-outline-primary" onClick={loadRates} disabled={loadingRates}>
              <FaSearchDollar className="me-2" />{loadingRates ? "Checking..." : "Check courier rates"}
            </button>

            {couriers.length > 0 && (
              <>
                <div className="table-responsive mt-3">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr><th style={{ width: 40 }}></th><th>Courier</th><th>Rate</th><th>Delivery</th><th>Rating</th></tr>
                    </thead>
                    <tbody>
                      {couriers.map((c) => (
                        <tr key={c.courierId} onClick={() => setCourierId(c.courierId)} style={{ cursor: "pointer" }}>
                          <td>
                            <input
                              type="radio"
                              className="form-check-input"
                              name="courier"
                              checked={courierId === c.courierId}
                              onChange={() => setCourierId(c.courierId)}
                            />
                          </td>
                          <td>
                            {c.name}
                            {c.recommended && <span className="badge bg-success ms-2">Recommended</span>}
                          </td>
                          <td>₹{c.rate.toFixed(2)}</td>
                          <td>{c.etd || (c.estimatedDays ? `${c.estimatedDays} days` : "—")}</td>
                          <td>{c.rating ? c.rating.toFixed(1) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-3">
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="schedulePickup"
                      checked={schedulePickup}
                      onChange={(e) => setSchedulePickup(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="schedulePickup">Request pickup right away</label>
                  </div>
                  <button className="btn btn-primary" onClick={createShipment} disabled={busy === "create"}>
                    {busy === "create" ? "Booking..." : "Create Shipment"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
