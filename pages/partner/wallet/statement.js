
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

                {/* OLD: showed raw description + raw referenceId (ObjectId) with no links */}
                {/* NEW: description shows prominently; referenceId is a "View Order" link */}
                {filteredTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      <br />
                      <span style={{ fontSize: 11, color: "#aaa" }}>
                        {new Date(tx.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx.description}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2, textTransform: "capitalize" }}>
                        {tx.referenceType?.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="credit">
                      {tx.type === "credit" ? `₹${Number(tx.amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="debit">
                      {tx.type === "debit" ? `₹${Number(tx.amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="muted reference">
                      {tx.referenceId ? (
                        <a
                          href={`/orders/${tx.referenceId}`}
                          style={{ fontSize: 12, color: "#6c5dd4", textDecoration: "none", fontWeight: 500 }}
                        >
                          View Order →
                        </a>
                      ) : "—"}
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











// "use client";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import Footer from "@/components/footer/Footer";
// import Offcanvas from "@/components/header/Offcanvas";
// import Topbar from "@/components/header/Topbar";


// function InvoiceDownloadButton({ walletTxnId }) {
//   const [loading, setLoading] = useState(false);

//   const downloadInvoice = async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");

//       const res = await axios.get(
//         `/api/partner/wallet/invoice-by-txn?walletTxnId=${walletTxnId}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       if (res.data?.invoice?.pdfUrl) {
//         window.open(res.data.invoice.pdfUrl, "_blank");
//       } else {
//         toast("Invoice not available");
//       }
//     } catch {
//       toast.error("Failed to download invoice");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <button
//       className="btn btn-sm btn-outline-primary"
//       onClick={downloadInvoice}
//       disabled={loading}
//     >
//       {loading ? "..." : "Download"}
//     </button>
//   );
// }


// export default function WalletStatement() {
//   const [transactions, setTransactions] = useState([]);

//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");

//   useEffect(() => {
//     const fetchTransactions = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(
//           "/api/partner/wallet/transactions",
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setTransactions(res.data.transactions || []);
//       } catch {
//         toast.error("Failed to load statement");
//       }
//     };
//     fetchTransactions();
//   }, []);

//   const filteredTransactions = useMemo(() => {
//     return transactions.filter((tx) => {
//       const txDate = new Date(tx.createdAt);
//       if (fromDate && txDate < new Date(fromDate)) return false;
//       if (toDate && txDate > new Date(toDate + "T23:59:59")) return false;
//       return true;
//     });
//   }, [transactions, fromDate, toDate]);

//   return (
//     <div className="wallet-area">
//       <Topbar />
//       <Offcanvas />

//       <div className="wallet-container">
//         {/* Header */}
//         <div className="wallet-header">
//           <h2>Account Statement</h2>
//           <p className="wallet-subtitle">
//             Complete history of your wallet transactions
//           </p>
//         </div>

//         {/* Filters */}
//         <div className="wallet-card filter-card">
//           <div className="statement-filters">
//             <div className="filter-field">
//               <label>From</label>
//               <input
//                 type="date"
//                 value={fromDate}
//                 onChange={(e) => setFromDate(e.target.value)}
//               />
//             </div>

//             <div className="filter-field">
//               <label>To</label>
//               <input
//                 type="date"
//                 value={toDate}
//                 onChange={(e) => setToDate(e.target.value)}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="wallet-card">
//           <div className="table-scroll">
//             <table className="statement-table">
//               <thead>
//                 <tr>
//                   <th>Date</th>
//                   <th>Description</th>
//                   <th className="right">Credit</th>
//                   <th className="right">Debit</th>
//                   <th className="right">Reference</th>
//                   <th className="right">Invoice</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {filteredTransactions.length === 0 && (
//                   <tr>
//                     <td colSpan="6" className="statement-empty">
//                       No transactions found
//                     </td>
//                   </tr>
//                 )}

//                 {filteredTransactions.map((tx) => (
//                   <tr key={tx._id}>
//                     <td className="muted">
//                       {new Date(tx.createdAt).toLocaleDateString()}
//                     </td>
//                     <td>{tx.description}</td>
//                     <td className="credit">
//                       {tx.type === "credit" ? `₹${tx.amount}` : "—"}
//                     </td>
//                     <td className="debit">
//                       {tx.type === "debit" ? `₹${tx.amount}` : "—"}
//                     </td>
//                     <td className="muted reference">
//                       {tx.referenceId || "—"}
//                     </td>

//                     <td className="right">
//                       <InvoiceDownloadButton walletTxnId={tx._id} />
//                     </td>

//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       <Footer />
//     </div>
//   );
// }
