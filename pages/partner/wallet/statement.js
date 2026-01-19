"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function WalletStatement() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "/api/partner/wallet/transactions",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTransactions(res.data.transactions);
      } catch {
        toast.error("Failed to load statement");
      }
    };
    fetchTransactions();
  }, []);

  return (
    <div className="container py-5">
      <h4>Account Statement</h4>

      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Credit</th>
            <th>Debit</th>
            <th>Ref</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx._id}>
              <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
              <td>{tx.description}</td>
              <td>{tx.type === "credit" ? `₹${tx.amount}` : "-"}</td>
              <td>{tx.type === "debit" ? `₹${tx.amount}` : "-"}</td>
              <td>{tx.referenceId || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
