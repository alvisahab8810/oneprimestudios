"use client";
// The tracking log for one order: every step the job has been through, in the
// order it happened, with who moved it.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { FiArrowLeft } from "react-icons/fi";

const fmtWhen = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function ProductionLogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    axios
      .get(`/api/orders/${id}/timeline`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error(err?.response?.data?.message || "Could not load the production log");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const steps = data?.steps || [];

  return (
    <>
      <Topbar />

      <div className="opl-wrap">
        <div className="container">
          <Link href={`/order-status/order/${id}`} className="opl-back">
            <FiArrowLeft /> Back to order
          </Link>

          <div className="opl-card">
            <div className="opl-head">
              <div>
                <span className="opl-eyebrow">Tracking Log</span>
                <h1>#{data?.orderNumber || "—"}</h1>
              </div>
              {data?.status && <span className="opl-pill">{String(data.status).toUpperCase()}</span>}
            </div>

            <div className="opl-body">
              {loading && <p className="opl-muted">Loading the log…</p>}

              {!loading && steps.length === 0 && (
                <p className="opl-muted">Nothing has been logged on this order yet.</p>
              )}

              {!loading && steps.length > 0 && (
                <ol className="opl-timeline">
                  {steps.map((step, index) => (
                    <li key={index} className={index === steps.length - 1 ? "is-last" : ""}>
                      <span className="opl-dot" />
                      <div className="opl-step">
                        <strong>{String(step.stage || step.status).toUpperCase()}</strong>
                        <span className="opl-when">{fmtWhen(step.at)}</span>
                        {step.note && <p className="opl-note">{step.note}</p>}
                        <span className="opl-by">— {step.by || "System"}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        .opl-wrap {
          background: #f6f7f9;
          padding: 24px 0 56px;
          min-height: 60vh;
        }
        .opl-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 14px;
        }
        .opl-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          max-width: 760px;
        }
        .opl-head {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: #fafafa;
          border-bottom: 1px solid #f3f4f6;
        }
        .opl-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .opl-head h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 2px 0 0;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }
        .opl-pill {
          background: #fdecea;
          color: #b50500;
          border: 1px solid #f7c7c4;
          border-radius: 999px;
          padding: 6px 15px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .opl-body {
          padding: 22px 24px;
        }
        .opl-muted {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }
        .opl-timeline {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .opl-timeline li {
          position: relative;
          padding: 0 0 22px 28px;
          border-left: 2px solid #e5e7eb;
        }
        .opl-timeline li.is-last {
          border-left-color: transparent;
          padding-bottom: 0;
        }
        .opl-dot {
          position: absolute;
          left: -7px;
          top: 3px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #E10600;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px #f7c7c4;
        }
        .opl-step strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #111827;
        }
        .opl-when {
          display: block;
          font-size: 12px;
          color: #6b7280;
          font-variant-numeric: tabular-nums;
          margin-top: 2px;
        }
        .opl-note {
          margin: 6px 0 0;
          font-size: 13px;
          color: #374151;
        }
        .opl-by {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #E10600;
        }
        @media (max-width: 575px) {
          .opl-head,
          .opl-body {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </>
  );
}
