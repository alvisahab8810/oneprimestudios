"use client";
// The Order Status search screens. All three ways of looking an order up —
// by number, by stage, by date — share the stage tabs and the results table,
// so they share this component and only differ in the search box on top.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { FiSearch, FiCalendar, FiHash, FiLayers } from "react-icons/fi";

const TITLES = {
  number: { heading: "Search By Order Number", icon: FiHash },
  stage: { heading: "Search By Order Stage", icon: FiLayers },
  date: { heading: "Search By Date", icon: FiCalendar },
};

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function OrderStatusSearch({ mode = "stage" }) {
  const router = useRouter();
  const { heading } = TITLES[mode] || TITLES.stage;

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [counts, setCounts] = useState([]);
  const [member, setMember] = useState({ memberId: "", name: "", press: "" });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Search boxes — only the ones this mode shows are ever filled
  const [activeStage, setActiveStage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [products, setProducts] = useState([]);

  const authHeader = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Partner tool, so a signed-out or retail visitor is sent away rather than
  // left looking at an empty screen
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (userType !== "partner") {
      setReady(true);
      setAllowed(false);
      return;
    }
    setReady(true);
    setAllowed(true);
  }, [router]);

  const load = useCallback(
    async (params) => {
      setLoading(true);
      try {
        const res = await axios.get("/api/orders/track", {
          params,
          headers: authHeader(),
        });
        setCounts(res.data.counts || []);
        if (res.data.member) setMember(res.data.member);
        setOrders(res.data.orders || []);
        if (res.data.truncated) {
          toast("Showing the latest 200 orders. Narrow the search for more.");
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error(err?.response?.data?.message || "Could not load orders");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // The tab counts are needed straight away on every one of the three screens
  useEffect(() => {
    if (!allowed) return;
    load({});
  }, [allowed, load]);

  // The product dropdown on the stage screen
  useEffect(() => {
    if (!allowed || mode !== "stage") return;
    axios
      .get("/api/products?limit=200", { headers: authHeader() })
      .then((res) => {
        const list = res.data?.products || res.data || [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [allowed, mode]);

  const pickStage = (id) => {
    setActiveStage(id);
    setSearched(true);
    load({ stage: id });
  };

  const searchByNumber = (event) => {
    event.preventDefault();
    const cleaned = orderNumber.trim();
    if (!cleaned) {
      toast.error("Enter an order number");
      return;
    }
    setSearched(true);
    load({ orderNumber: cleaned });
  };

  const searchByDate = (event) => {
    event.preventDefault();
    if (!from && !to) {
      toast.error("Pick a date range");
      return;
    }
    if (from && to && new Date(from) > new Date(to)) {
      toast.error("The start date is after the end date");
      return;
    }
    setSearched(true);
    load({ from, to });
  };

  const searchStage = (event) => {
    event.preventDefault();
    setSearched(true);
    load(activeStage ? { stage: activeStage } : {});
  };

  // The product and name boxes refine what came back for the chosen stage
  const productName = products.find((p) => p._id === productFilter)?.name || "";
  const rows = orders.filter((order) => {
    if (productName && !(order.detail || "").toLowerCase().includes(productName.toLowerCase())) {
      return false;
    }
    if (nameFilter.trim()) {
      const needle = nameFilter.trim().toLowerCase();
      const haystack = `${order.orderName} ${member.name} ${order.orderNumber}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  if (!ready) {
    return (
      <>
        <Topbar />
        <div className="container py-5 text-center text-muted">Loading…</div>
        <Footer />
      </>
    );
  }

  if (!allowed) {
    return (
      <>
        <Topbar />
        <div className="container py-5">
          <div className="osx-empty">
            <h5>Order Status is for partner accounts</h5>
            <p className="text-muted mb-3">
              Your orders and their progress are on the My Orders page.
            </p>
            <Link href="/orders" className="osx-btn">
              Go to My Orders
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Topbar />

      <div className="osx-wrap">
        <div className="container">
          <div className="osx-head">
            <h1>{heading}</h1>
            <p>
              {member.press ? `${member.press} · ` : ""}
              {member.memberId ? `Member ID ${member.memberId}` : "Your orders"}
            </p>
          </div>

          {/* STAGE TABS — the count on each one is this account's own orders */}
          <div className="osx-stages">
            {counts.map((stage) => (
              <button
                key={stage.id}
                type="button"
                className={`osx-stage ${activeStage === stage.id ? "is-active" : ""}`}
                onClick={() => pickStage(stage.id)}
              >
                {stage.label} <span>({stage.count})</span>
              </button>
            ))}
          </div>

          {/* SEARCH BOXES */}
          {mode === "number" && (
            <form className="osx-filters" onSubmit={searchByNumber}>
              <div className="osx-field">
                <label>Order number</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. OPS-10234"
                />
              </div>
              <button type="submit" className="osx-btn" disabled={loading}>
                <FiSearch /> Search
              </button>
            </form>
          )}

          {mode === "date" && (
            <form className="osx-filters" onSubmit={searchByDate}>
              <div className="osx-field">
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="osx-field">
                <label>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button type="submit" className="osx-btn" disabled={loading}>
                <FiSearch /> Search
              </button>
            </form>
          )}

          {mode === "stage" && (
            <form className="osx-filters" onSubmit={searchStage}>
              <div className="osx-field">
                <label>Product</label>
                <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="osx-field">
                <label>Order name</label>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search by order name"
                />
              </div>
              <button type="submit" className="osx-btn" disabled={loading}>
                <FiSearch /> Search
              </button>
            </form>
          )}

          {/* RESULTS */}
          <div className="osx-table-wrap">
            <table className="osx-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Date</th>
                  <th>Member ID</th>
                  <th>Printing Press</th>
                  <th>Order Name</th>
                  <th>Order Detail</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="osx-note">
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="osx-note">
                      {searched
                        ? "No orders match this search."
                        : mode === "stage"
                        ? "Pick a stage above to see those orders."
                        : "Use the search above to find an order."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((order) => (
                    <tr key={order._id}>
                      <td className="osx-mono">#{order.orderNumber || "—"}</td>
                      <td>{fmtDate(order.createdAt)}</td>
                      <td className="osx-mono">{member.memberId || "—"}</td>
                      <td>{member.press || "—"}</td>
                      <td>{order.orderName || "—"}</td>
                      <td className="osx-detail">{order.detail || "—"}</td>
                      <td>
                        <Link href={`/order-status/order/${order._id}`} className="osx-details-btn">
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .osx-wrap {
          background: #f6f7f9;
          padding: 28px 0 56px;
          min-height: 60vh;
        }
        .osx-head h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
          color: #111827;
        }
        .osx-head p {
          margin: 0 0 18px;
          font-size: 13px;
          color: #6b7280;
        }
        .osx-stages {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .osx-stage {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .osx-stage span {
          color: #6b7280;
          font-weight: 500;
        }
        .osx-stage:hover {
          border-color: #16a34a;
          color: #15803d;
        }
        .osx-stage.is-active {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
        }
        .osx-stage.is-active span {
          color: rgba(255, 255, 255, 0.85);
        }
        .osx-filters {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          margin-bottom: 16px;
        }
        .osx-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 200px;
          flex: 1 1 200px;
        }
        .osx-field label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #6b7280;
        }
        .osx-field input,
        .osx-field select {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 9px 11px;
          font-size: 14px;
          color: #111827;
          background: #fff;
          width: 100%;
        }
        .osx-field input:focus,
        .osx-field select:focus {
          outline: none;
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
        }
        .osx-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #16a34a;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .osx-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .osx-table-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow-x: auto;
        }
        .osx-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .osx-table th {
          background: #f9fafb;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #6b7280;
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        .osx-table td {
          padding: 13px 14px;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .osx-table tr:last-child td {
          border-bottom: none;
        }
        .osx-mono {
          font-variant-numeric: tabular-nums;
          font-weight: 600;
          color: #111827;
        }
        .osx-detail {
          max-width: 280px;
          font-size: 13px;
          color: #6b7280;
        }
        .osx-note {
          text-align: center;
          padding: 34px 14px !important;
          color: #9ca3af !important;
          font-size: 14px;
        }
        .osx-details-btn {
          display: inline-block;
          background: #16a34a;
          color: #fff;
          border-radius: 5px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .osx-details-btn:hover {
          background: #15803d;
          color: #fff;
        }
        .osx-empty {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
        }
        @media (max-width: 575px) {
          .osx-filters {
            padding: 14px;
          }
          .osx-field {
            min-width: 100%;
          }
          .osx-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
