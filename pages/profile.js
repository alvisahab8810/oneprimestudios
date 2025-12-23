"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";

export default function ProfilePage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

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

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/user/update", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Profile updated successfully");

      // 🔥 Sync updated name/email with localStorage (for header popup)
localStorage.setItem("name", res.data.user.name);
localStorage.setItem("email", res.data.user.email);

// Optional: force header re-render on all pages
window.dispatchEvent(new Event("user-profile-updated"));

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
