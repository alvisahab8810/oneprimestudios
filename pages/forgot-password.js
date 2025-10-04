// pages/forgot-password.js
import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      toast.success(res.data.message || "Password reset link sent!");
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image-section"></div>

      <div className="auth-form-section">
        <div className="logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </div>

        <h3 className="form-heading">Forgot Password</h3>
        <p className="form-subtext">
          Enter your registered email address. We’ll send you a link to reset
          your password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="sign-button" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="signup-toggle">
          Remembered your password?{" "}
          <span onClick={() => router.push("/login")}>Login here</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
