// /components/WalletAmountForm.js
import { useState } from "react";

export default function WalletAmountForm({ onGenerate }) {
  const [amt, setAmt] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const value = Number(amt);
    if (!value || value <= 0) return alert("Enter a valid amount");
    onGenerate(value);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 420 }}>
      <label style={{ display: "block", marginBottom: 8 }}>Enter Amount to be Added</label>
      <input
        type="number"
        min="1"
        step="1"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="Enter amount (INR)"
        style={{ padding: "12px 16px", width: "100%", fontSize: 16 }}
      />
      <button type="submit" style={{ marginTop: 12, padding: "10px 16px" }}>
        Generate QR Code
      </button>
    </form>
  );
}
