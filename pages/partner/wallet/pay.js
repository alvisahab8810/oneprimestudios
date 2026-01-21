// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";

// export default function WalletPay() {
//   const router = useRouter();
//   const { qr, txn, amount } = router.query;

//   const [success, setSuccess] = useState(false);
//   const [failed, setFailed] = useState(false);

//   useEffect(() => {
//     if (!txn) return;

//     const interval = setInterval(async () => {
//       try {
//         const token = localStorage.getItem("token");

//         const res = await axios.get(
//   `/api/partner/wallet/transaction-status?transactionId=${txn}&t=${Date.now()}`,
//   {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Cache-Control": "no-cache",
//     },
//   }
// );

//         if (res.data.status === "success") {
//           clearInterval(interval);
//           setSuccess(true);
//         }

//         if (res.data.status === "failed") {
//           clearInterval(interval);
//           setFailed(true);
//         }
//       } catch (err) {
//         console.error("Polling error:", err);
//       }
//     }, 3000);

//     return () => clearInterval(interval);
//   }, [txn]);

//   // Auto redirect after success
//   useEffect(() => {
//     if (success) {
//       setTimeout(() => {
//         router.push("/partner/wallet");
//       }, 3000);
//     }
//   }, [success, router]);

//   return (
//     <div className="container py-5 text-center">
//       {/* PAYMENT SCREEN */}
//       {!success && !failed && (
//         <>
//           <h4>Scan & Pay</h4>
//           <p>Amount: ₹{amount}</p>

//           {qr && (
//             <img
//               src={qr}
//               alt="QR Code"
//               style={{ width: 220, margin: "20px 0" }}
//             />
//           )}

//           <p className="mt-3 text-muted">
//             Scan with any UPI app. QR valid for 10 minutes.
//           </p>
//         </>
//       )}

//       {/* SUCCESS POPUP */}
//       {success && (
//         <div className="card p-4">
//           <h4 className="text-success">✅ Success!</h4>
//           <p>
//             Your payment has been successfully added to your wallet.
//             <br />
//             This is an automatic wallet update, so there's no need to send
//             payment screenshot via WhatsApp.
//           </p>

//           <button
//             className="btn btn-primary mt-2"
//             onClick={() => router.push("/partner/wallet")}
//           >
//             View Wallet
//           </button>
//         </div>
//       )}

//       {/* FAILURE STATE */}
//       {failed && (
//         <div className="card p-4">
//           <h4 className="text-danger">❌ Payment Failed</h4>
//           <p>Please try again.</p>

//           <button
//             className="btn btn-secondary mt-2"
//             onClick={() => router.push("/partner/wallet/add")}
//           >
//             Try Again
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function WalletPay() {
  const router = useRouter();
  const { qr, txn, amount, expiresAt } = router.query;

  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  /* ===============================
     POLLING (UNCHANGED – SAFE)
     =============================== */
  useEffect(() => {
    if (!txn) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `/api/partner/wallet/transaction-status?transactionId=${txn}&t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          },
        );

        if (res.data.status === "success") {
          clearInterval(interval);
          setSuccess(true);
        }

        if (res.data.status === "failed") {
          clearInterval(interval);
          setFailed(true);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [txn]);

  /* ===============================
     AUTO REDIRECT (UNCHANGED)
     =============================== */
  useEffect(() => {
    if (success) {
      setTimeout(() => {
        router.push("/partner/wallet");
      }, 3000);
    }
  }, [success, router]);

  /* ===============================
     ⏱️ COUNTDOWN TIMER (NEW)
     =============================== */
  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((Number(expiresAt) - Date.now()) / 1000),
      );
      setTimeLeft(diff);

      if (diff === 0) {
        clearInterval(timer);
        setFailed(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (sec) => {
    if (sec === null) return "10:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="wallet-area">
      <div className="wallet-wrap center">
        {/* ================= PAYMENT ================= */}
        {!success && !failed && (
          <div className="wallet-card pay-card">
            <h2>Scan & Pay</h2>

            <p className="pay-amount">₹{amount}</p>

            {/* {qr && (
              <img
                src={qr}
                alt="UPI QR Code"
                className="qr-image"
              />
            )} */}

            {qr ? (
              <img src={qr} alt="UPI QR Code" className="qr-image" />
            ) : (
              <div className="qr-placeholder">Loading QR…</div>
            )}

            <div className="timer">
              QR expires in <strong>{formatTime(timeLeft)}</strong>
            </div>

            <p className="pay-note">
              Scan this QR using any UPI app to complete the payment.
              <br />
              <strong>Do not refresh this page.</strong>
            </p>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {success && (
          <div className="wallet-card status success">
            <h2>Payment Successful</h2>
            <p>
              Amount has been added to your wallet automatically.
              <br />
              Redirecting you to wallet…
            </p>

            <button
              className="wallet-btn primary full"
              onClick={() => router.push("/partner/wallet")}
            >
              View Wallet
            </button>
          </div>
        )}

        {/* ================= FAILED ================= */}
        {failed && (
          <div className="wallet-card status failed">
            <h2>Payment Failed / Expired</h2>
            <p>
              The QR code is no longer valid.
              <br />
              Please try again.
            </p>

            <button
              className="wallet-btn secondary full"
              onClick={() => router.push("/partner/wallet/add")}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
