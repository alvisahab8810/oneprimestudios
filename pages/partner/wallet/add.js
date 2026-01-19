"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

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
    <div className="container py-5">
      <h4>Add Money to Wallet</h4>

      <div className="card p-4 mt-3">
        <label>Enter Amount</label>
        <input
          type="number"
          className="form-control mb-3"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹500"
        />

        <button
          className="btn btn-success"
          onClick={generateQR}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate QR"}
        </button>
      </div>
    </div>
  );
}
