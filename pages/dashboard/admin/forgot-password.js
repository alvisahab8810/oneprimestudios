"use client";
// pages/dashboard/admin/forgot-password.js
// Dashboard users (admin and OPS) request their own password reset link here.
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";

export default function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await axios.post("/api/admin/forgot-password", { email });
      toast.success(res.data?.message || "Reset link sent");
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send the reset link");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4" style={{ width: "380px" }}>
        <h3 className="text-center mb-2">Reset Password</h3>
        <p className="text-muted small text-center mb-4">
          For invited team accounts. Enter your dashboard email and we will send
          you a link to set a new password.
        </p>

        {sent ? (
          <>
            <div className="alert alert-success" style={{ fontSize: 14 }}>
              Check your inbox. The link works for 1 hour.
            </div>
            <Link href="/dashboard/admin/login" className="btn btn-primary w-100">
              Back to Login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label>Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={sending}
              />
            </div>
            <button className="btn btn-primary w-100" disabled={sending}>
              {sending ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="text-center mt-3">
              <Link href="/dashboard/admin/login" className="small">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
