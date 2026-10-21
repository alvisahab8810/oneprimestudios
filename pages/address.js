"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

const EMPTY = {
  name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pinCode: "",
};

export default function MyAddressPage() {
  const router = useRouter();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/user/address", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.status === 403) {
          // Partner profiles are edited on their own screen
          router.push("/profile");
          return;
        }

        if (!res.ok) throw new Error(data.message || "Failed to load address");

        setForm({ ...EMPTY, ...(data.address || {}) });
      } catch (err) {
        toast.error(err.message || "Failed to load address");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErrors({});

      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/address", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.message || "Could not save the address");
      }

      toast.success("Address updated");

      // The header shows the account name, so it has to follow a rename
      if (data.user?.name) {
        localStorage.setItem("name", data.user.name);
        window.dispatchEvent(new Event("user-profile-updated"));
      }
    } catch (err) {
      toast.error(err.message || "Could not save the address");
    } finally {
      setSaving(false);
    }
  };

  const field = (name) => `form-control ${errors[name] ? "is-invalid" : ""}`;

  return (
    <>
      <Topbar />
      <Offcanvas />

      <div className="container padding-top-40 padding-b-50">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card p-4">
              <h4 className="mb-1 fw-semibold">Delivery Address</h4>
              <p className="text-muted" style={{ fontSize: 13 }}>
                This is the address your orders are shipped to. Change it here
                any time, or edit it while placing an order.
              </p>

              {loading ? (
                <p className="mb-0">Loading your address...</p>
              ) : (
                <form onSubmit={handleSave} className="mt-3">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Full Name *
                      </label>
                      <input
                        className={field("name")}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                      />
                      {errors.name && (
                        <div className="invalid-feedback">{errors.name}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Phone *</label>
                      <input
                        className={field("phone")}
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                      />
                      {errors.phone && (
                        <div className="invalid-feedback">{errors.phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Street Address *
                    </label>
                    <textarea
                      className={field("street")}
                      name="street"
                      rows={2}
                      value={form.street}
                      onChange={handleChange}
                      placeholder="House number, street, area, landmark"
                    />
                    {errors.street && (
                      <div className="invalid-feedback">{errors.street}</div>
                    )}
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">City *</label>
                      <input
                        className={field("city")}
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                      />
                      {errors.city && (
                        <div className="invalid-feedback">{errors.city}</div>
                      )}
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">State *</label>
                      <input
                        className={field("state")}
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                      />
                      {errors.state && (
                        <div className="invalid-feedback">{errors.state}</div>
                      )}
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">
                        Pin Code *
                      </label>
                      <input
                        className={field("pinCode")}
                        name="pinCode"
                        value={form.pinCode}
                        onChange={handleChange}
                        maxLength={6}
                      />
                      {errors.pinCode && (
                        <div className="invalid-feedback">{errors.pinCode}</div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <button
                      type="submit"
                      className="place-order-btn"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Address"}
                    </button>

                    <Link href="/orders" className="text-decoration-none">
                      Back to my orders
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
