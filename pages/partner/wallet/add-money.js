import { useState } from "react";
import axios from "axios";

export default function AddMoney() {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("enter");

  const staticQrImg = "/qr/your-static-qr.jpeg"; // your QR code image

const submitTopup = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Not logged in — token missing.");
    return;
  }

  const res = await fetch("/api/wallet/create-topup-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // 🔥 IMPORTANT
    },
    body: JSON.stringify({ amount: Number(amount) }),
  });

  const data = await res.json();
  console.log("API RESPONSE:", data);

  if (data.success) {
    setStep("submitted");
  } else {
    alert(data.error || data.message || "Something went wrong");
  }
};



  return (
    <div style={{ padding: 24 }}>
      {step === "enter" && (
        <>
          <h2>Enter Amount</h2>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={() => setStep("qr")}>Generate QR</button>
        </>
      )}

      {step === "qr" && (
        <>
          <h3>Pay ₹{amount} to this QR</h3>
          <img src={staticQrImg} style={{ width: 240 }} />
          
          <button onClick={submitTopup} style={{ marginTop: 20 }}>
            I've Paid → Submit Request
          </button>
        </>
      )}

      {step === "submitted" && (
        <h3>Your request is submitted. Admin will approve soon.</h3>
      )}
    </div>
  );
}
