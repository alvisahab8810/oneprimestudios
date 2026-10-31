"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

const LABELS = ["Home", "Work", "Other"];

const EMPTY = {
  label: "Home",
  name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pinCode: "",
};

export default function MyAddressPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // The form is open either for a brand new address or for one being edited;
  // editingId tells the two apart.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The address a row-level action is running on, so only that card is frozen
  const [busyId, setBusyId] = useState("");

  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = async () => {
    try {
      const res = await fetch("/api/user/addresses", { headers: authHeaders() });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        // Partner profiles are edited on their own screen
        router.push("/profile");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load addresses");

      setAddresses(data.addresses || []);
    } catch (err) {
      toast.error(err.message || "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultId = useMemo(
    () => String(addresses.find((a) => a.isDefault)?._id || ""),
    [addresses]
  );

  const openNew = () => {
    setEditingId("");
    setForm(EMPTY);
    setMakeDefault(addresses.length === 0);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (address) => {
    setEditingId(String(address._id));
    setForm({
      label: LABELS.includes(address.label) ? address.label : "Home",
      name: address.name || "",
      phone: address.phone || "",
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      pinCode: address.pinCode || "",
    });
    setMakeDefault(!!address.isDefault);
    setErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId("");
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean =
      name === "phone" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: clean }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrors({});

      const res = await fetch(
        editingId ? `/api/user/addresses/${editingId}` : "/api/user/addresses",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ...form, isDefault: makeDefault }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.message || "Could not save the address");
      }

      setAddresses(data.addresses || []);
      toast.success(data.message || "Address saved");
      closeForm();
    } catch (err) {
      toast.error(err.message || "Could not save the address");
    } finally {
      setSaving(false);
    }
  };

  const chooseDefault = async (address) => {
    if (address.isDefault) return;

    try {
      setBusyId(String(address._id));

      const res = await fetch(`/api/user/addresses/${address._id}`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update");

      setAddresses(data.addresses || []);
      toast.success("Deliver here by default");
    } catch (err) {
      toast.error(err.message || "Could not update");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (address) => {
    if (!confirm(`Delete the address for ${address.name}?`)) return;

    try {
      setBusyId(String(address._id));

      const res = await fetch(`/api/user/addresses/${address._id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not delete");

      setAddresses(data.addresses || []);
      toast.success("Address removed");
    } catch (err) {
      toast.error(err.message || "Could not delete");
    } finally {
      setBusyId("");
    }
  };

  const invalid = (name) => (errors[name] ? " is-invalid" : "");

  return (
    <>
      <Topbar />
      <Offcanvas />

      <div className="addr-wrap">
        <div className="addr-head">
          <div>
            <h1 className="addr-title">Delivery addresses</h1>
            <p className="addr-sub">
              Save as many as you like and pick one while placing an order. The
              selected address is used by default at checkout.
            </p>
          </div>

          <Link href="/orders" className="addr-back">
            Back to my orders
          </Link>
        </div>

        {loading ? (
          <div className="addr-skeleton">
            <div className="addr-sk" />
            <div className="addr-sk" />
          </div>
        ) : (
          <>
            {addresses.length === 0 && !formOpen && (
              <div className="addr-empty">
                <p className="addr-empty-t">No addresses saved yet</p>
                <p className="addr-empty-s">
                  Add one now and your next order will ship straight to it.
                </p>
                <button type="button" className="addr-btn addr-btn-dark" onClick={openNew}>
                  Add your first address
                </button>
              </div>
            )}

            {addresses.length > 0 && (
              <div className="addr-grid">
                {addresses.map((address) => {
                  const id = String(address._id);
                  const selected = id === defaultId;
                  const busy = busyId === id;

                  return (
                    <div
                      key={id}
                      className={`addr-card${selected ? " addr-card-on" : ""}${
                        busy ? " addr-card-busy" : ""
                      }`}
                    >
                      {/* The whole card is the radio, the way a delivery
                          address is picked on any shopping app */}
                      <label className="addr-pick">
                        <input
                          type="radio"
                          name="defaultAddress"
                          className="addr-radio"
                          checked={selected}
                          disabled={busy}
                          onChange={() => chooseDefault(address)}
                        />

                        <span className="addr-body">
                          <span className="addr-row1">
                            <span className="addr-name">{address.name}</span>
                            <span className="addr-tag">{address.label || "Home"}</span>
                            {selected && <span className="addr-tag addr-tag-on">Default</span>}
                          </span>

                          <span className="addr-lines">
                            {address.street}
                            <br />
                            {address.city}, {address.state} {address.pinCode}
                          </span>

                          <span className="addr-phone">Phone: {address.phone}</span>
                        </span>
                      </label>

                      <div className="addr-acts">
                        {!selected && (
                          <button
                            type="button"
                            className="addr-link"
                            disabled={busy}
                            onClick={() => chooseDefault(address)}
                          >
                            Deliver here
                          </button>
                        )}
                        <button
                          type="button"
                          className="addr-link"
                          disabled={busy}
                          onClick={() => openEdit(address)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="addr-link addr-link-danger"
                          disabled={busy}
                          onClick={() => remove(address)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!formOpen && (
                  <button type="button" className="addr-add" onClick={openNew}>
                    <span className="addr-add-plus">+</span>
                    <span>Add a new address</span>
                  </button>
                )}
              </div>
            )}

            {formOpen && (
              <form className="addr-form" onSubmit={handleSave}>
                <div className="addr-form-head">
                  <h2 className="addr-form-t">
                    {editingId ? "Edit address" : "Add a new address"}
                  </h2>
                  <button type="button" className="addr-link" onClick={closeForm}>
                    Cancel
                  </button>
                </div>

                <div className="addr-tags">
                  {LABELS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`addr-tagbtn${form.label === label ? " addr-tagbtn-on" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, label }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="addr-fields">
                  <div className="addr-f">
                    <label className="addr-l">Full name *</label>
                    <input
                      className={`form-control${invalid("name")}`}
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>

                  <div className="addr-f">
                    <label className="addr-l">Phone *</label>
                    <input
                      className={`form-control${invalid("phone")}`}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>

                  <div className="addr-f addr-f-wide">
                    <label className="addr-l">Street address *</label>
                    <textarea
                      className={`form-control${invalid("street")}`}
                      name="street"
                      rows={2}
                      value={form.street}
                      onChange={handleChange}
                      placeholder="House number, street, area, landmark"
                    />
                    {errors.street && <div className="invalid-feedback">{errors.street}</div>}
                  </div>

                  <div className="addr-f">
                    <label className="addr-l">City *</label>
                    <input
                      className={`form-control${invalid("city")}`}
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                    />
                    {errors.city && <div className="invalid-feedback">{errors.city}</div>}
                  </div>

                  <div className="addr-f">
                    <label className="addr-l">State *</label>
                    <input
                      className={`form-control${invalid("state")}`}
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                    />
                    {errors.state && <div className="invalid-feedback">{errors.state}</div>}
                  </div>

                  <div className="addr-f">
                    <label className="addr-l">Pin code *</label>
                    <input
                      className={`form-control${invalid("pinCode")}`}
                      name="pinCode"
                      value={form.pinCode}
                      onChange={handleChange}
                      inputMode="numeric"
                      maxLength={6}
                    />
                    {errors.pinCode && <div className="invalid-feedback">{errors.pinCode}</div>}
                  </div>
                </div>

                <label className="addr-check">
                  <input
                    type="checkbox"
                    checked={makeDefault}
                    disabled={addresses.length === 0}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                  />
                  <span>Use this as my default delivery address</span>
                </label>

                <div className="addr-form-acts">
                  <button type="submit" className="addr-btn addr-btn-dark" disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Save changes" : "Save address"}
                  </button>
                  <button type="button" className="addr-btn" onClick={closeForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <Footer />

      <style jsx>{`
        .addr-wrap {
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 16px 56px;
        }
        .addr-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .addr-title {
          font-size: 24px;
          font-weight: 700;
          color: #111111;
          margin: 0 0 6px;
        }
        .addr-sub {
          font-size: 13.5px;
          color: #6b7280;
          margin: 0;
          max-width: 56ch;
          line-height: 1.5;
        }
        .addr-back {
          font-size: 13.5px;
          color: #111111;
          text-decoration: underline;
          text-underline-offset: 3px;
          white-space: nowrap;
        }
        .addr-back:hover {
          color: #e10600;
        }

        .addr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }

        .addr-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .addr-card:hover {
          border-color: #c9cdd3;
        }
        .addr-card-on {
          border-color: #111111;
          box-shadow: inset 0 0 0 1px #111111;
        }
        .addr-card-busy {
          opacity: 0.6;
          pointer-events: none;
        }

        .addr-pick {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          cursor: pointer;
          margin: 0;
        }
        .addr-radio {
          margin-top: 3px;
          width: 17px;
          height: 17px;
          accent-color: #111111;
          flex: none;
          cursor: pointer;
        }
        .addr-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .addr-row1 {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }
        .addr-name {
          font-weight: 700;
          font-size: 14.5px;
          color: #111111;
        }
        .addr-tag {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f3f4f6;
          color: #4b5563;
          border-radius: 4px;
          padding: 2px 7px;
        }
        .addr-tag-on {
          background: #111111;
          color: #fff;
        }
        .addr-lines {
          font-size: 13.5px;
          color: #374151;
          line-height: 1.55;
        }
        .addr-phone {
          font-size: 12.5px;
          color: #6b7280;
        }

        .addr-acts {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          border-top: 1px solid #f2f4f6;
          padding-top: 11px;
        }
        .addr-link {
          background: none;
          border: 0;
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          color: #111111;
          cursor: pointer;
        }
        .addr-link:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .addr-link-danger {
          color: #e10600;
        }
        .addr-link:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .addr-add {
          border: 1px dashed #c9cdd3;
          border-radius: 12px;
          background: #fafbfc;
          color: #111111;
          font-size: 14px;
          font-weight: 600;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
        .addr-add:hover {
          border-color: #111111;
          background: #f6f7f9;
        }
        .addr-add-plus {
          font-size: 26px;
          line-height: 1;
          font-weight: 400;
        }

        .addr-empty {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 44px 20px;
          text-align: center;
        }
        .addr-empty-t {
          font-size: 16px;
          font-weight: 700;
          color: #111111;
          margin: 0 0 4px;
        }
        .addr-empty-s {
          font-size: 13.5px;
          color: #6b7280;
          margin: 0 0 18px;
        }

        .addr-form {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
          margin-top: 16px;
        }
        .addr-form-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .addr-form-t {
          font-size: 16.5px;
          font-weight: 700;
          color: #111111;
          margin: 0;
        }
        .addr-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .addr-tagbtn {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          cursor: pointer;
        }
        .addr-tagbtn-on {
          border-color: #111111;
          background: #111111;
          color: #fff;
        }

        .addr-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 14px;
        }
        .addr-f-wide {
          grid-column: 1 / -1;
        }
        .addr-l {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
        }

        .addr-check {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 16px;
          font-size: 13.5px;
          color: #374151;
          cursor: pointer;
        }
        .addr-check input {
          width: 16px;
          height: 16px;
          accent-color: #111111;
        }

        .addr-form-acts {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .addr-btn {
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #111111;
          border-radius: 8px;
          padding: 11px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .addr-btn:hover:not(:disabled) {
          background: #f6f7f9;
        }
        .addr-btn-dark {
          background: #111111;
          border-color: #111111;
          color: #fff;
        }
        .addr-btn-dark:hover:not(:disabled) {
          background: #000;
        }
        .addr-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .addr-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }
        .addr-sk {
          height: 150px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%);
          background-size: 400% 100%;
          animation: addr-shimmer 1.3s ease-in-out infinite;
        }
        @keyframes addr-shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: 0 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .addr-sk {
            animation: none;
          }
        }

        @media (max-width: 575px) {
          .addr-wrap {
            padding: 22px 16px 44px;
          }
          .addr-title {
            font-size: 20px;
          }
          .addr-grid,
          .addr-skeleton {
            grid-template-columns: 1fr;
          }
          .addr-form {
            padding: 16px;
          }
          .addr-form-acts {
            flex-direction: column-reverse;
          }
          .addr-form-acts :global(button),
          .addr-btn {
            width: 100%;
          }
          .addr-add {
            min-height: 92px;
            flex-direction: row;
          }
        }
      `}</style>
    </>
  );
}
