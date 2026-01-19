// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";

// export default function WalletPay() {
//   const router = useRouter();
//   const { qr, txn, amount, expiresAt } = router.query;
//   const [success, setSuccess] = useState(false);

//   useEffect(() => {
//     if (!txn) return;

//     const interval = setInterval(async () => {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(
//         "/api/partner/wallet/transactions?limit=1",
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       if (res.data.transactions[0]?.status === "success") {
//         clearInterval(interval);
//         setSuccess(true);
//       }
//     }, 3000);

//     return () => clearInterval(interval);
//   }, [txn]);

//   return (
//     <div className="container py-5 text-center">
//       {!success ? (
//         <>
//           <h4>Scan & Pay</h4>
//           <p>Amount: ₹{amount}</p>

//           {qr && <img src={qr} alt="QR Code" style={{ width: 220 }} />}

//           <p className="mt-3 text-muted">
//             Scan with any UPI app. QR valid for 10 minutes.
//           </p>
//         </>
//       ) : (
//         <div className="card p-4">
//           <h4 className="text-success">✅ Success!</h4>
//           <p>
//             Your payment has been successfully added to your wallet.
//             <br />
//             No need to send payment screenshot via WhatsApp.
//           </p>

//           <button
//             className="btn btn-primary"
//             onClick={() => router.push("/partner/wallet")}
//           >
//             View Wallet
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
  const { qr, txn, amount } = router.query;

  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);

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
  }
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

  // Auto redirect after success
  useEffect(() => {
    if (success) {
      setTimeout(() => {
        router.push("/partner/wallet");
      }, 3000);
    }
  }, [success, router]);

  return (
    <div className="container py-5 text-center">
      {/* PAYMENT SCREEN */}
      {!success && !failed && (
        <>
          <h4>Scan & Pay</h4>
          <p>Amount: ₹{amount}</p>

          {qr && (
            <img
              src={qr}
              alt="QR Code"
              style={{ width: 220, margin: "20px 0" }}
            />
          )}

          <p className="mt-3 text-muted">
            Scan with any UPI app. QR valid for 10 minutes.
          </p>
        </>
      )}

      {/* SUCCESS POPUP */}
      {success && (
        <div className="card p-4">
          <h4 className="text-success">✅ Success!</h4>
          <p>
            Your payment has been successfully added to your wallet.
            <br />
            This is an automatic wallet update, so there's no need to send
            payment screenshot via WhatsApp.
          </p>

          <button
            className="btn btn-primary mt-2"
            onClick={() => router.push("/partner/wallet")}
          >
            View Wallet
          </button>
        </div>
      )}

      {/* FAILURE STATE */}
      {failed && (
        <div className="card p-4">
          <h4 className="text-danger">❌ Payment Failed</h4>
          <p>Please try again.</p>

          <button
            className="btn btn-secondary mt-2"
            onClick={() => router.push("/partner/wallet/add")}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
