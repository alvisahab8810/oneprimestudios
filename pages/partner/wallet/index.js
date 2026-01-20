"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

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
    // <div className="wallet-area">
    //   <Topbar />
    //   <Offcanvas />
    //   <div className="container py-5">
    //     <h3 className="mb-3">Partner Wallet</h3>

    //     <div className="card p-4 mb-4">
    //       <h5>Available Balance</h5>
    //       <h2 className="text-success">₹{balance.toFixed(2)}</h2>
    //     </div>

    //     <button
    //       className="btn btn-primary me-2"
    //       onClick={() => router.push("/partner/wallet/add")}
    //     >
    //       Add Money
    //     </button>

    //     <button
    //       className="btn btn-outline-secondary"
    //       onClick={() => router.push("/partner/wallet/statement")}
    //     >
    //       Account Statement
    //     </button>
    //   </div>
    //   <Footer />

    // </div>


    <div className="wallet-area">
  <Topbar />
  <Offcanvas />

  <div className="wallet-wrap">
    <div className="wallet-header">
      <h2>Wallet</h2>
      <span className="wallet-subtitle">
        View balance and manage funds
      </span>
    </div>

    <div className="wallet-card">
      <div className="wallet-balance-row">
        <div>
          <p className="wallet-label">Available Balance</p>
          <h1 className="wallet-amount">₹{balance.toFixed(2)}</h1>
        </div>

        <div className="wallet-icon">
           <img src="/assets/images/icons/wallet1.png" alt="Wallet Icon" width={40}></img>
        </div>
      </div>

      <div className="wallet-actions">
        <button
          className="wallet-btn primary"
          onClick={() => router.push("/partner/wallet/add")}
        >
          <span>＋</span> Add Money
        </button>

        <button
          className="wallet-btn secondary"
          onClick={() => router.push("/partner/wallet/statement")}
        >
          View Statement
        </button>
      </div>
    </div>
  </div>

  <Footer />
</div>

  );
}
