"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";

export default function ProfilePage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.userType !== "partner") {
          toast.error("Access denied");
          return;
        }

        setForm(res.data);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put("/api/user/update", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Profile updated successfully");

      if (res.data?.user) {
        localStorage.setItem("name", res.data.user.name || form.name);
        localStorage.setItem("email", res.data.user.email || form.email);
        window.dispatchEvent(new Event("user-profile-updated"));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  return (
    <>
      <Topbar />
      <div className="container py-5">
        <h3 className="mb-4">Partner Profile</h3>

        <div className="mb-3">
          <label>Name</label>
          <input
            className="form-control"
            name="name"
            value={form.name || ""}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Mobile Number</label>
          <input
            className={`form-control ${errors.phone ? "is-invalid" : ""}`}
            name="phone"
            value={form.phone || ""}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            maxLength={10}
          />
          {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
        </div>

        <div className="mb-3">
          <label>Company Name</label>
          <input
            className="form-control"
            name="companyName"
            value={form.companyName || ""}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>GST Number</label>
          <input
            className="form-control"
            name="gstNumber"
            value={form.gstNumber || ""}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Business Address</label>
          <textarea
            className="form-control"
            name="businessAddress"
            value={form.businessAddress || ""}
            onChange={handleChange}
          />
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>
      <Footer />
    </>
  );
}
