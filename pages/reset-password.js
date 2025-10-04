// pages/reset-password.js
import { useRouter } from "next/router";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token, id } = router.query; // ✅ Extract from URL

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please enter all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post("/api/auth/reset-password", {
        token,
        id,
        newPassword,
      });

      toast.success(res.data.message);

      setTimeout(() => {
        router.push("/login"); // ✅ Redirect after reset
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image-section"></div>
        
      <div className="auth-form-section">
          <div className="logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </div>
        <h3 className="form-heading">Reset Your Password</h3>

        <form onSubmit={handleReset} className="auth-form">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit" className="sign-button">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
