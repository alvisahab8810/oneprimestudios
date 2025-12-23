"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { useRouter } from "next/router";
import { FaTags, FaSave, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";

export default function CreateCoupon() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [loading, setLoading] = useState(false);

  // 🧾 FORM STATE
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",

    // 🔕 TEMPORARILY DISABLED (DO NOT REMOVE)
    discountValue: "",
    // maxDiscount: "",
    // usageLimit: "",

    minOrderAmount: "",
    expiryDate: "",
    perUserLimit: 1,
    allowedUserTypes: ["customer"],
    isActive: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUserTypeChange = (type) => {
    setForm((prev) => {
      const exists = prev.allowedUserTypes.includes(type);
      return {
        ...prev,
        allowedUserTypes: exists
          ? prev.allowedUserTypes.filter((t) => t !== type)
          : [...prev.allowedUserTypes, type],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.code) {
      toast.error("Coupon code is required");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      await axios.post(
        "/api/admin/coupons/create",
        {
          ...form,

          // 🔕 TEMPORARILY DISABLED (BACKEND SAFE)
          // discountValue: Number(form.discountValue),
          // maxDiscount: Number(form.maxDiscount),
          // usageLimit: Number(form.usageLimit),

          minOrderAmount: form.minOrderAmount
            ? Number(form.minOrderAmount)
            : undefined,
          perUserLimit: Number(form.perUserLimit),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Coupon created successfully");
      router.push("/dashboard/admin/coupons");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div
        className="main-area"
        
      >
        <div className="container-fluid p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link
              href="/dashboard/admin/coupons"
              className="btn btn-outline-secondary"
            >
              <FaArrowLeft />
            </Link>
            <h1 className="mb-0">
              <FaTags className="me-2" />
              Create Coupon
            </h1>
          </div>

          <form
            className="card p-4 shadow-sm"
            onSubmit={handleSubmit}
            style={{ maxWidth: "900px" }}
          >
            {/* COUPON CODE */}
            <div className="mb-3">
              <label className="form-label">Coupon Code</label>
              <input
                type="text"
                className="form-control"
                name="code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                required
              />
            </div>

            {/* DISCOUNT TYPE */}
            <div className="mb-3">
              <label className="form-label">Discount Type</label>
              <select
                className="form-select"
                name="discountType"
                value={form.discountType}
                onChange={handleChange}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>

            {/* 🔕 DISCOUNT VALUE (COMMENTED) */}
            
            <div className="mb-3">
              <label className="form-label">Discount Value</label>
              <input
                type="number"
                className="form-control"
                name="discountValue"
                value={form.discountValue}
                onChange={handleChange}
                required
              />
            </div>
           

            {/* 🔕 MAX DISCOUNT (COMMENTED) */}
            {/*
            {form.discountType === "percentage" && (
              <div className="mb-3">
                <label className="form-label">Max Discount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  name="maxDiscount"
                  value={form.maxDiscount}
                  onChange={handleChange}
                />
              </div>
            )}
            */}

            {/* MIN ORDER */}
            <div className="mb-3">
              <label className="form-label">
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                className="form-control"
                name="minOrderAmount"
                value={form.minOrderAmount}
                onChange={handleChange}
              />
            </div>

            {/* EXPIRY DATE */}
            <div className="mb-3">
              <label className="form-label">Expiry Date</label>
              <input
                type="datetime-local"
                className="form-control"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>

            {/* 🔕 USAGE LIMIT (COMMENTED) */}
            {/*
            <div className="mb-3">
              <label className="form-label">Usage Limit (Global)</label>
              <input
                type="number"
                className="form-control"
                name="usageLimit"
                value={form.usageLimit}
                onChange={handleChange}
              />
            </div>
            */}

            {/* PER USER LIMIT */}
            <div className="mb-3">
              <label className="form-label">Per User Limit</label>
              <input
                type="number"
                className="form-control"
                name="perUserLimit"
                value={form.perUserLimit}
                onChange={handleChange}
              />
            </div>

            {/* USER TYPES */}
            <div className="mb-3">
              <label className="form-label">Allowed User Types</label>
              <div className="d-flex gap-4">
                {["customer", "partner"].map((type) => (
                  <div key={type} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={form.allowedUserTypes.includes(type)}
                      onChange={() => handleUserTypeChange(type)}
                    />
                    {/* <label className="form-check-label text-uppercase">
                      {type}
                    </label> */}

                    <label className="form-check-label text-capitalize">
  {type === "customer" ? "Customer" : "Partner"}
</label>

                  </div>
                ))}
              </div>
            </div>

            {/* ACTIVE */}
            <div className="mb-4 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              <label className="form-check-label">
                Coupon is Active
              </label>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <FaSave className="me-2" />
              {loading ? "Saving..." : "Create Coupon"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
