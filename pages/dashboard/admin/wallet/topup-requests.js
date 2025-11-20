import { useEffect, useState } from "react";

export default function AdminTopups() {
  const [requests, setRequests] = useState([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

useEffect(() => {
  fetch("/api/admin/wallet/get-topup-requests", {
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => setRequests(data.requests || []));
}, []);

  const approve = async (id) => {
    await fetch("/api/admin/wallet/approve-topup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId: id })
    });
    alert("Approved");
    location.reload();
  };

  const reject = async (id) => {
    await fetch("/api/admin/wallet/reject-topup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId: id })
    });
    alert("Rejected");
    location.reload();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Wallet Top-up Requests</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((r) => (
            <tr key={r._id}>
              <td>{r.partnerId?.name} ({r.partnerId?.email})</td>
              <td>₹{r.amount}</td>
              <td>{r.status}</td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>
                {r.status === "pending" ? (
                  <>
                    <button onClick={() => approve(r._id)}>Approve</button>
                    &nbsp;
                    <button onClick={() => reject(r._id)}>Reject</button>
                  </>
                ) : (
                  "Processed"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
