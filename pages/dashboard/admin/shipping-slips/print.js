// pages/dashboard/admin/shipping-slips/print.js — the box slips, ready to print.
// Opened from the Shipping Slips screen with ?ids=<orderId>,<orderId>.
// One slip is printed per box, so an order packed in 3 boxes gives 3 slips
// marked "Box 1 of 3", "Box 2 of 3" and "Box 3 of 3".
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import axios from "axios";
import { toast } from "react-hot-toast";

const SIZES = {
  label: { name: "4 × 6 in label (thermal printer)", page: "size: 4in 6in; margin: 0;" },
  a4: { name: "A4 paper (2 slips per page)", page: "size: A4; margin: 10mm;" },
};
const SIZE_KEY = "opsSlipSize";
const MAX_ITEM_LINES = 6;

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

function Slip({ slip, seller, box, boxes }) {
  const t = slip.shipTo;
  const shown = slip.items.slice(0, MAX_ITEM_LINES);
  const more = slip.items.length - shown.length;

  return (
    <section className="slip">
      <div className="row top">
        <span className="tag">SHIP TO</span>
        <span className="side">{slip.side}</span>
        <span className="box">Box {box} of {boxes}</span>
      </div>

      <div className="to">
        <div className="name">{t.name || "—"}</div>
        {t.company && <div className="company">{t.company}</div>}
        <div className="addr">{t.street}</div>
        <div className="addr">{[t.city, t.state].filter(Boolean).join(", ")}</div>
        <div className="pin-row">
          <span className="pin">PIN {t.zip || "______"}</span>
          {t.phone && <span className="phone">Ph: {t.phone}</span>}
        </div>
      </div>

      {slip.cod > 0 ? (
        <div className="pay cod">
          <span>COD · COLLECT</span>
          <strong>{money(slip.cod)}</strong>
        </div>
      ) : (
        <div className="pay prepaid">PREPAID · DO NOT COLLECT CASH</div>
      )}

      {(slip.courier || slip.awbCode) && (
        <div className="courier">
          <div className="row">
            <span>Courier: <b>{slip.courier || "—"}</b></span>
            {slip.awbCode && <span>AWB: <b>{slip.awbCode}</b></span>}
          </div>
          {slip.awbBarcode && <div className="code" dangerouslySetInnerHTML={{ __html: slip.awbBarcode }} />}
        </div>
      )}

      <div className="order">
        <div className="row">
          <span>Order <b>{slip.orderNumber}</b></span>
          <span>{fmtDate(slip.orderDate)}</span>
        </div>
        {slip.orderName && <div className="small">Ref: {slip.orderName}</div>}
        {slip.orderBarcode && <div className="code" dangerouslySetInnerHTML={{ __html: slip.orderBarcode }} />}
      </div>

      <div className="items">
        <div className="small b">Contents</div>
        {shown.map((it, i) => (
          <div key={i} className="item">
            <span className="qty">{it.quantity}×</span>
            <span>
              {it.name}
              {it.freeQty > 0 && <em> (incl. {it.freeQty} free)</em>}
              {it.options && <span className="opts"> · {it.options}</span>}
            </span>
          </div>
        ))}
        {more > 0 && <div className="small">+ {more} more item{more > 1 ? "s" : ""}</div>}
      </div>

      {(slip.weightKg > 0 || slip.dimensions || slip.note) && (
        <div className="pack">
          {slip.weightKg > 0 && <span>Wt: <b>{slip.weightKg} kg</b></span>}
          {slip.dimensions && <span>Size: <b>{slip.dimensions}</b></span>}
          {slip.note && <div className="note">{slip.note}</div>}
        </div>
      )}

      <div className="from">
        <span className="small b">FROM</span> {seller.name}, {seller.street}, {seller.city}, {seller.state} {seller.pincode}
        {seller.gstin && <> · GSTIN {seller.gstin}</>}
        <div className="small">If undelivered, please return to the address above.</div>
      </div>
    </section>
  );
}

export default function PrintShippingSlips() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [size, setSize] = useState("label");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_KEY);
      if (saved && SIZES[saved]) setSize(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const ids = String(router.query.ids || "");
    if (!ids) {
      setError("No orders selected.");
      return;
    }
    axios
      .get("/api/admin/shipping-slips/print", { params: { ids }, withCredentials: true })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status === 401) router.replace("/dashboard/admin/login");
        else setError(err?.response?.data?.message || "Could not load the slips.");
      });
  }, [router.isReady, router.query.ids]);

  const pages = useMemo(() => {
    if (!data) return [];
    const out = [];
    data.slips.forEach((s) => {
      if (s.cancelled) return;
      const boxes = Math.max(1, Number(s.boxes) || 1);
      for (let b = 1; b <= boxes; b++) out.push({ slip: s, box: b, boxes });
    });
    return out;
  }, [data]);

  const cancelled = data ? data.slips.filter((s) => s.cancelled) : [];

  const changeSize = (v) => {
    setSize(v);
    try {
      localStorage.setItem(SIZE_KEY, v);
    } catch {}
  };

  const print = async () => {
    if (!pages.length) return;
    setPrinting(true);
    try {
      const ids = [...new Set(pages.map((p) => String(p.slip._id)))];
      await axios.post("/api/admin/shipping-slips/print", { ids }, { withCredentials: true });
    } catch {
      toast.error("The print was not recorded, but you can still print");
    } finally {
      setPrinting(false);
    }
    window.print();
  };

  return (
    <div className="slip-page">
      <Head>
        <title>Print shipping slips</title>
      </Head>

      <div className="toolbar no-print">
        <button type="button" className="ghost" onClick={() => router.push("/dashboard/admin/shipping-slips")}>
          ← Back to slips
        </button>
        <label htmlFor="slip-size" className="lbl">Paper</label>
        <select id="slip-size" value={size} onChange={(e) => changeSize(e.target.value)}>
          {Object.entries(SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.name}</option>
          ))}
        </select>
        <span className="count">
          {pages.length} slip{pages.length === 1 ? "" : "s"}
        </span>
        <button type="button" className="primary" onClick={print} disabled={!pages.length || printing}>
          {printing ? "Preparing..." : "Print"}
        </button>
      </div>

      {error && <p className="msg no-print">{error}</p>}
      {!data && !error && <p className="msg no-print">Loading slips...</p>}
      {cancelled.length > 0 && (
        <p className="msg warn no-print">
          Skipped cancelled order{cancelled.length > 1 ? "s" : ""}: {cancelled.map((s) => s.orderNumber).join(", ")}
        </p>
      )}

      <div className={`sheet size-${size}`}>
        {data &&
          pages.map((p, i) => (
            <Slip key={`${p.slip._id}-${p.box}-${i}`} slip={p.slip} seller={data.seller} box={p.box} boxes={p.boxes} />
          ))}
      </div>

      <style jsx global>{`
        @page { ${SIZES[size].page} }
        body { background: #e5e7eb; margin: 0; }
        .slip-page { font-family: Arial, Helvetica, sans-serif; color: #000; }
        .toolbar { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #ddd; }
        .toolbar select { height: 36px; border: 1px solid #ccc; border-radius: 8px; padding: 0 10px; font-size: 13px; }
        .toolbar .lbl { font-size: 13px; color: #555; margin-left: 8px; }
        .toolbar .count { font-size: 13px; color: #555; margin-left: auto; }
        .toolbar button { height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .toolbar .ghost { background: #fff; border: 1px solid #ccc; }
        .toolbar .primary { background: #E10600; color: #fff; border: 0; }
        .toolbar .primary:disabled { opacity: 0.6; cursor: default; }
        .msg { margin: 16px; font-size: 14px; }
        .msg.warn { color: #b45309; }

        .sheet { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px; }
        .slip { background: #fff; box-sizing: border-box; border: 2px solid #000; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; overflow: hidden; font-size: 11px; line-height: 1.3; }
        .size-label .slip { width: 4in; height: 6in; }
        .size-a4 .slip { width: 190mm; height: 135mm; font-size: 12.5px; }
        .slip .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .slip .top { border-bottom: 1px solid #000; padding-bottom: 4px; }
        .slip .tag { font-weight: 700; letter-spacing: 1px; }
        .slip .side { border: 1.5px solid #000; padding: 0 6px; font-weight: 700; }
        .slip .box { font-weight: 700; }
        .slip .to .name { font-size: 1.5em; font-weight: 700; }
        .slip .to .company { font-weight: 700; }
        .slip .pin-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px; }
        .slip .pin { font-size: 1.45em; font-weight: 800; letter-spacing: 1px; }
        .slip .phone { font-weight: 700; }
        .slip .pay { text-align: center; font-weight: 800; padding: 5px; letter-spacing: 0.5px; }
        .slip .pay.cod { background: #000; color: #fff; display: flex; justify-content: center; gap: 10px; font-size: 1.3em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .slip .pay.prepaid { border: 2px solid #000; }
        .slip .courier, .slip .order { border-top: 1px dashed #000; padding-top: 4px; }
        .slip .code { display: flex; justify-content: center; margin-top: 3px; }
        .slip .code svg { height: 46px; width: auto; max-width: 100%; }
        .slip .items { border-top: 1px dashed #000; padding-top: 4px; flex: 1; min-height: 0; overflow: hidden; }
        .slip .item { display: flex; gap: 6px; }
        .slip .item .qty { font-weight: 700; min-width: 28px; }
        .slip .item .opts { color: #222; }
        .slip .pack { border-top: 1px dashed #000; padding-top: 4px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
        .slip .pack .note { width: 100%; font-weight: 700; text-transform: uppercase; }
        .slip .from { border-top: 1px solid #000; padding-top: 4px; font-size: 0.9em; }
        .slip .small { font-size: 0.9em; }
        .slip .b { font-weight: 700; }

        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .sheet { padding: 0; gap: 0; display: block; }
          .size-label .slip { page-break-after: always; break-after: page; }
          .size-label .slip:last-child { page-break-after: auto; break-after: auto; }
          .size-a4 .slip { margin: 0 auto 5mm; page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
