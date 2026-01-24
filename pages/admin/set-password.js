import { useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

export default function SetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!password || password !== confirmPassword) {
    toast.error("Passwords do not match");
    return;
  }

  setLoading(true);
  const toastId = toast.loading("Setting password...");

  try {
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    // 🔥 DO NOT ASSUME JSON
    const contentType = res.headers.get("content-type");
    let data = {};

    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      // HTML response (redirect / error page)
      throw new Error("Session expired. Please open invite link again.");
    }

    if (!res.ok) {
      throw new Error(data.message || "Failed to set password");
    }

    toast.success("Password set successfully", { id: toastId });

    setTimeout(() => {
      window.location.href = "/dashboard/admin/login";
    }, 1200);
  } catch (err) {
    toast.error(err.message, { id: toastId });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container mt-5">
      <div
        className="card shadow p-4 mx-auto"
        style={{ maxWidth: "420px" }}
      >
        <h4 className="mb-3 text-center">Set Your Password</h4>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
