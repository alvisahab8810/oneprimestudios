import { useEffect, useState } from "react";

export default function PartnerWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("/api/wallet/partner-dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.balance);
        setTransactions(data.transactions || []);
        setPending(data.pending || []);
      });
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Partner Wallet</h1>

      <div style={{ padding: 20, border: "1px solid #ccc", width: 300 }}>
        <h2>Wallet Balance</h2>
        <h1 style={{ color: "green" }}>₹{balance}</h1>
      </div>

      {pending.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Pending Top-Up Requests</h2>
          <table border="1" cellPadding="10">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p._id}>
                  <td>₹{p.amount}</td>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <h2>Transaction History</h2>
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.type}</td>
                <td>₹{t.amount}</td>
                <td>{t.description}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
