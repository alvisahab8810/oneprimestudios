"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

export default function WalletHome() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/partner/wallet", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBalance(res.data.balance);
      } catch (err) {
        toast.error("Failed to load wallet");
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  if (loading) return <p>Loading wallet...</p>;

  return (
    <div className="container py-5">
      <h3 className="mb-3">Partner Wallet</h3>

      <div className="card p-4 mb-4">
        <h5>Available Balance</h5>
        <h2 className="text-success">₹{balance.toFixed(2)}</h2>
      </div>

      <button
        className="btn btn-primary me-2"
        onClick={() => router.push("/partner/wallet/add")}
      >
        Add Money
      </button>

      <button
        className="btn btn-outline-secondary"
        onClick={() => router.push("/partner/wallet/statement")}
      >
        Account Statement
      </button>
    </div>
  );
}
