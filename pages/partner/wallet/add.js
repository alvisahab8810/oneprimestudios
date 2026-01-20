"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

export default function AddMoney() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const generateQR = async () => {
    if (!amount || amount < 1) {
      toast.error("Minimum amount is ₹1");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "/api/partner/wallet/generate-qr",
        { amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push({
        pathname: "/partner/wallet/pay",
        query: {
          qr: res.data.qrImage,
          txn: res.data.transactionId,
          amount: res.data.amount,
          expiresAt: res.data.expiresAt,
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "QR generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className="wallet-area">
  <Topbar />
  <Offcanvas />

  <div className="wallet-wrap">
    <div className="wallet-header">
      <h2>Add Money</h2>
      <span className="wallet-subtitle">
        Add funds to your wallet securely
      </span>
    </div>

    <div className="wallet-card">
      <div className="form-group">
        <label className="wallet-label">Amount</label>
        <input
          type="number"
          className="wallet-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount (e.g. 500)"
        />
      </div>

      <button
        className="wallet-btn primary full"
        onClick={generateQR}
        disabled={loading}
      >
        {loading ? "Generating QR…" : "Generate QR"}
      </button>

      <p className="wallet-helper">
        You will be shown a UPI QR code to complete the payment.
      </p>
    </div>
  </div>

  <Footer />
</div>

  );
}
