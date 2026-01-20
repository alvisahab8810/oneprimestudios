// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import Footer from "@/components/footer/Footer";
// import Offcanvas from "@/components/header/Offcanvas";
// import Topbar from "@/components/header/Topbar";

// export default function WalletStatement() {
//   const [transactions, setTransactions] = useState([]);

//   useEffect(() => {
//     const fetchTransactions = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(
//           "/api/partner/wallet/transactions",
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setTransactions(res.data.transactions);
//       } catch {
//         toast.error("Failed to load statement");
//       }
//     };
//     fetchTransactions();
//   }, []);

//   return (
//     // <div className="container py-5">
//     //   <h4>Account Statement</h4>

//     //   <table className="table table-bordered mt-3">
//     //     <thead>
//     //       <tr>
//     //         <th>Date</th>
//     //         <th>Description</th>
//     //         <th>Credit</th>
//     //         <th>Debit</th>
//     //         <th>Ref</th>
//     //       </tr>
//     //     </thead>
//     //     <tbody>
//     //       {transactions.map((tx) => (
//     //         <tr key={tx._id}>
//     //           <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
//     //           <td>{tx.description}</td>
//     //           <td>{tx.type === "credit" ? `₹${tx.amount}` : "-"}</td>
//     //           <td>{tx.type === "debit" ? `₹${tx.amount}` : "-"}</td>
//     //           <td>{tx.referenceId || "—"}</td>
//     //         </tr>
//     //       ))}
//     //     </tbody>
//     //   </table>
//     // </div>

//     <div className="wallet-area">
//   <Topbar />
//   <Offcanvas />

//   <div className="container py-5">
//     <div className="wallet-header">
//       <h2>Account Statement</h2>
//       <span className="wallet-subtitle">
//         Complete history of your wallet transactions
//       </span>
//     </div>

//     <div className="wallet-card">
//       <div className="statement-table">
//         <div className="statement-head">
//           <span>Date</span>
//           <span>Description</span>
//           <span className="right">Credit</span>
//           <span className="right">Debit</span>
//           <span className="right">Reference</span>
//         </div>

//         {transactions.length === 0 && (
//           <div className="statement-empty">
//             No transactions found
//           </div>
//         )}

//         {transactions.map((tx) => (
//           <div className="statement-row" key={tx._id}>
//             <span className="muted">
//               {new Date(tx.createdAt).toLocaleDateString()}
//             </span>

//             <span>{tx.description}</span>

//             <span className="right credit">
//               {tx.type === "credit" ? `₹${tx.amount}` : "—"}
//             </span>

//             <span className="right debit">
//               {tx.type === "debit" ? `₹${tx.amount}` : "—"}
//             </span>

//             <span className="right muted">
//               {tx.referenceId || "—"}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   </div>

//   <Footer />
// </div>

//   );
// }



"use client";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Footer from "@/components/footer/Footer";
import Offcanvas from "@/components/header/Offcanvas";
import Topbar from "@/components/header/Topbar";

export default function WalletStatement() {
  const [transactions, setTransactions] = useState([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "/api/partner/wallet/transactions",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTransactions(res.data.transactions || []);
      } catch {
        toast.error("Failed to load statement");
      }
    };
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      if (fromDate && txDate < new Date(fromDate)) return false;
      if (toDate && txDate > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, fromDate, toDate]);

  return (
    <div className="wallet-area">
      <Topbar />
      <Offcanvas />

      <div className="wallet-container">
        {/* Header */}
        <div className="wallet-header">
          <h2>Account Statement</h2>
          <p className="wallet-subtitle">
            Complete history of your wallet transactions
          </p>
        </div>

        {/* Filters */}
        <div className="wallet-card filter-card">
          <div className="statement-filters">
            <div className="filter-field">
              <label>From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="wallet-card">
          <div className="table-scroll">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="right">Credit</th>
                  <th className="right">Debit</th>
                  <th className="right">Reference</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="statement-empty">
                      No transactions found
                    </td>
                  </tr>
                )}

                {filteredTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="muted">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td>{tx.description}</td>
                    <td className="credit">
                      {tx.type === "credit" ? `₹${tx.amount}` : "—"}
                    </td>
                    <td className="debit">
                      {tx.type === "debit" ? `₹${tx.amount}` : "—"}
                    </td>
                    <td className="muted reference">
                      {tx.referenceId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
