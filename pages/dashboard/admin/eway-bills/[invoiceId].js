// pages/dashboard/admin/eway-bills/[invoiceId].js
// E-way bill form (EWB-01): Part A (consignment) + Part B (transport), PDF / download / email.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiArrowLeft, FiSave, FiCheckCircle, FiFileText, FiDownload, FiSend, FiXCircle, FiExternalLink } from "react-icons/fi";
import { validityDays, computeValidUpto, taxRateLabel, UQC, downloadEwayBillPdf } from "@/lib/ewayBill";

const STATUS = {
  DRAFT:     { label: "Draft",     bg: "#e0e7ff", color: "#3730a3" },
  GENERATED: { label: "Generated", bg: "#dcfce7", color: "#15803d" },
  CANCELLED: { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" },
};
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const dt = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
// Date -> "YYYY-MM-DDTHH:mm" in the browser's local time, for <input type="datetime-local">
const dateTimeInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function EwayBillForm() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [bill, setBill] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [busy, setBusy] = useState("");
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    if (!invoiceId) return;
    axios
      .get(`/api/admin/eway-bills/${invoiceId}`, { withCredentials: true })
      .then(({ data }) => {
        setInvoice(data.invoice);
        setBill(data.ewayBill);
        setIsSaved(data.isSaved);
        setEmailTo(data.invoice?.partnerAddress?.email || "");
      })
      .catch((e) => toast.error(e.response?.data?.message || "Failed to load"));
  }, [invoiceId]);

  if (!bill || !invoice) {
    return (
      <div className="d-flex bg-light min-vh-100">
        <Sidebar sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, padding: 40, color: "#9ca3af" }}>Loading…</div>
      </div>
    );
  }

  const locked = bill.status === "CANCELLED";
  const set = (k, v) => setBill((b) => ({ ...b, [k]: v }));
  const setAddr = (grp, k, v) => setBill((b) => ({ ...b, [grp]: { ...(b[grp] || {}), [k]: v } }));

  const save = async (action, silent = false) => {
    setBusy(action || "save");
    try {
      const { data } = await axios.put(`/api/admin/eway-bills/${invoiceId}`, { ...bill, action }, { withCredentials: true });
      setBill(data.ewayBill);
      setIsSaved(true);
      if (!silent) toast.success(action === "generate" ? "E-way bill generated" : action === "cancel" ? "E-way bill cancelled" : "Saved");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
      return false;
    } finally {
      setBusy("");
    }
  };

  const makePdf = async () => {
    if (!locked && !(await save())) return;
    setBusy("pdf");
    try {
      const { data } = await axios.post("/api/admin/eway-bills/generate-pdf", { invoiceId }, { withCredentials: true });
      setBill((b) => ({ ...b, pdfUrl: data.pdfUrl }));
      window.open(`${data.pdfUrl}?t=${Date.now()}`, "_blank");
      toast.success("PDF ready");
    } catch (e) {
      toast.error(e.response?.data?.message || "PDF failed");
    } finally {
      setBusy("");
    }
  };

  // Saves the latest details, builds a fresh PDF (with QR once generated) and downloads it.
  const downloadPdf = async () => {
    if (!locked && !(await save(undefined, true))) return;
    setBusy("download");
    try {
      const pdfUrl = await downloadEwayBillPdf(invoiceId);
      setBill((b) => ({ ...b, pdfUrl }));
    } catch (e) {
      toast.error(e.message || "Failed to download PDF");
    } finally {
      setBusy("");
    }
  };

  const sendEmail = async () => {
    const to = emailTo.trim();
    if (!to) return toast.error("Enter the customer's email address");
    if (!window.confirm(`Send this e-way bill to ${to}?`)) return;
    if (!(await save(undefined, true))) return; // PDF is built from the saved details
    setBusy("email");
    try {
      const { data } = await axios.post("/api/admin/eway-bills/send-email", { invoiceId, to }, { withCredentials: true });
      setBill((b) => ({ ...b, sentAt: data.sentAt, sentTo: data.sentTo, pdfUrl: data.pdfUrl }));
      toast.success(`E-way bill sent to ${data.sentTo}`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send");
    } finally {
      setBusy("");
    }
  };

  const cancel = () => {
    if (window.confirm("Cancel this e-way bill? (Also cancel it on the NIC portal within 24 hours.)")) save("cancel");
  };

  const input = (label, k, props = {}) => (
    <Field label={label}>
      <input style={S.input} disabled={locked} value={bill[k] ?? ""} onChange={(e) => set(k, e.target.value)} {...props} />
    </Field>
  );
  const select = (label, k, options) => (
    <Field label={label}>
      <select style={S.input} disabled={locked} value={bill[k] ?? ""} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
  const addrFields = (grp, fields) => (
    <div style={S.grid}>
      {fields.map(([k, l, props = {}]) => (
        <Field key={k} label={l} wide={k === "street"}>
          <input style={S.input} disabled={locked} value={bill[grp]?.[k] ?? ""} onChange={(e) => setAddr(grp, k, e.target.value)} {...props} />
        </Field>
      ))}
    </div>
  );
  const ADDRESS = [["street", "Address"], ["city", "Place / City"], ["state", "State"], ["pincode", "PIN Code", { maxLength: 6, inputMode: "numeric" }]];
  const setGood = (i, k, v) =>
    setBill((b) => ({ ...b, goods: (b.goods || []).map((g, j) => (j === i ? { ...g, [k]: v } : g)) }));

  const days = validityDays(bill.distanceKm, bill.vehicleType);
  const validPreview = computeValidUpto(bill.generatedAt, bill.distanceKm, bill.vehicleType);
  const goods = bill.goods || [];
  const totTaxable = goods.reduce((s, g) => s + Number(g.taxableAmount || 0), 0);
  const st = STATUS[bill.status] || STATUS.DRAFT;
  const isRoad = bill.transportMode === "Road";

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <nav style={S.topbar}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={S.burger}>☰</button>
          <Link href="/dashboard/admin/eway-bills" style={{ color: "#374151", display: "flex", marginRight: 12 }}><FiArrowLeft size={18} /></Link>
          <span style={{ fontWeight: 700, fontSize: 18 }}>E-Way Bill · {invoice.invoiceNumber}</span>
          <span style={{ ...S.badge, background: isSaved ? st.bg : "#fef3c7", color: isSaved ? st.color : "#92400e", marginLeft: 12 }}>
            {isSaved ? st.label : "Not saved"}
          </span>
          {bill.sentAt && (
            <span style={{ ...S.badge, background: "#dcfce7", color: "#15803d", marginLeft: 8 }}>Sent</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={downloadPdf} disabled={!!busy} style={{ ...S.topBtn, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              <FiDownload size={12} /> {busy === "download" ? "Preparing..." : "Download PDF"}
            </button>
            {bill.status === "GENERATED" && (
              <button onClick={sendEmail} disabled={!!busy} style={{ ...S.topBtn, border: "none", background: "#15803d", color: "#fff", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                <FiSend size={12} /> {busy === "email" ? "Sending..." : bill.sentAt ? "Resend to Customer" : "Send to Customer"}
              </button>
            )}
          </div>
        </nav>

        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }} className="ewb-layout">
          <div>
            <Card title="Invoice">
              <div style={S.grid}>
                <Info label="Invoice No." value={invoice.invoiceNumber} />
                <Info label="Date" value={new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN")} />
                <Info label="Party" value={invoice.partnerAddress?.companyName || invoice.partnerName} />
                <Info label="Party GSTIN" value={invoice.partnerAddress?.gst || "URP (Unregistered)"} />
                <Info label="Value of Goods" value={money(invoice.grandTotal)} />
              </div>
              <Link href={`/dashboard/admin/invoices/${invoice._id}`} style={{ fontSize: 12, color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10 }}>
                View invoice <FiExternalLink size={11} />
              </Link>
            </Card>

            <Card title="Part A — Consignment Details">
              <div style={S.grid}>
                {select("Supply Type", "supplyType", ["OUTWARD", "INWARD"])}
                {select("Sub Supply Type", "subSupplyType", ["Supply", "Export", "Job Work", "SKD/CKD", "Recipient Not Known", "For Own Use", "Exhibition or Fairs", "Line Sales", "Others"])}
                {select("Document Type", "documentType", ["Tax Invoice", "Bill of Supply", "Delivery Challan", "Credit Note", "Others"])}
                {select("Transaction Type", "transactionType", ["Regular", "Bill To-Ship To", "Bill From-Dispatch From", "Combination of 2 and 3"])}
              </div>
              <div style={S.sub}>Bill To (Recipient)</div>
              {addrFields("billTo", [
                ["gstin", "GSTIN (URP if unregistered)", { maxLength: 15, style: { ...S.input, textTransform: "uppercase" } }],
                ["name", "Legal Name"],
                ["state", "State"],
              ])}
              <div style={S.sub}>Dispatch From</div>
              {addrFields("dispatchFrom", ADDRESS)}
              <div style={S.sub}>Ship To (Place of Delivery)</div>
              {addrFields("shipTo", ADDRESS)}
            </Card>

            <Card title="Goods Details">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr>
                      {["HSN Code", "Product Name & Desc.", "Quantity", "Unit", "Taxable Amt", "Tax Rate (C+S+I+Cess+Cess Non.Advol)"].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {goods.map((g, i) => (
                      <tr key={i}>
                        <td style={S.td}>
                          <input style={{ ...S.input, width: 100 }} disabled={locked} maxLength={8} inputMode="numeric" value={g.hsnCode ?? ""} onChange={(e) => setGood(i, "hsnCode", e.target.value.replace(/\D/g, ""))} />
                        </td>
                        <td style={S.td}>{g.description}</td>
                        <td style={S.td}>
                          <input style={{ ...S.input, width: 90 }} disabled={locked} type="number" min={0} step="any" value={g.qty ?? ""} onChange={(e) => setGood(i, "qty", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <select style={{ ...S.input, width: 90 }} disabled={locked} value={g.unit || "NOS"} onChange={(e) => setGood(i, "unit", e.target.value)}>
                            {UQC.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>{money(g.taxableAmount)}</td>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{taxRateLabel(invoice.gstType, g.gstPercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...S.grid, marginTop: 14 }}>
                <Info label="Total Taxable" value={money(totTaxable)} />
                <Info label="CGST" value={money(invoice.cgstAmount)} />
                <Info label="SGST" value={money(invoice.sgstAmount)} />
                <Info label="IGST" value={money(invoice.igstAmount)} />
                <Info label="Total Invoice Value" value={money(invoice.grandTotal)} />
              </div>
              <p style={S.hint}>Description, amounts and tax rates come from the invoice. Set the HSN code and unit exactly as entered on the portal.</p>
            </Card>

            <Card title="Part B — Transport Details">
              <div style={S.grid}>
                {select("Mode", "transportMode", ["Road", "Rail", "Air", "Ship"])}
                {select("Vehicle Type", "vehicleType", ["Regular", "ODC"])}
                {input("Approx. Distance (km)", "distanceKm", { type: "number", min: 0 })}
                {isRoad && input("Vehicle Number", "vehicleNumber", { placeholder: "UP32AB1234", style: { ...S.input, textTransform: "uppercase" } })}
                {input("Transporter Name", "transporterName")}
                {input("Transporter ID (GSTIN/TRANSIN)", "transporterId", { maxLength: 15, style: { ...S.input, textTransform: "uppercase" } })}
                {input(isRoad ? "Transporter Doc No. (LR/GR)" : "RR / AWB / BL No.", "transportDocNo")}
                <Field label="Transport Doc Date">
                  <input type="date" style={S.input} disabled={locked} value={dateInput(bill.transportDocDate)} onChange={(e) => set("transportDocDate", e.target.value)} />
                </Field>
                {input("CEWB No. (if any)", "cewbNumber", { placeholder: "Consolidated EWB No." })}
              </div>
            </Card>
          </div>

          <div style={{ position: "sticky", top: 80 }}>
            <Card title="E-Way Bill No.">
              <input
                style={{ ...S.input, fontFamily: "monospace", fontSize: 16, letterSpacing: 1 }}
                disabled={locked}
                maxLength={14}
                placeholder="12-digit EWB No."
                value={bill.ewbNumber ?? ""}
                onChange={(e) => set("ewbNumber", e.target.value.replace(/[^\d\s]/g, ""))}
              />
              <p style={S.hint}>
                Generate the EWB No. on <a href="https://ewaybillgst.gov.in" target="_blank" rel="noreferrer">ewaybillgst.gov.in</a> and enter it here.
              </p>
              <Field label="Generated Date & Time (as on portal)">
                <input
                  type="datetime-local"
                  style={{ ...S.input, marginBottom: 10 }}
                  disabled={locked}
                  value={dateTimeInput(bill.generatedAt)}
                  onChange={(e) => set("generatedAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </Field>
              <div style={S.kv}><span>Validity</span><b>{days} day{days > 1 ? "s" : ""}</b></div>
              <div style={S.kv}><span>Valid Until</span><b>{dt(validPreview)}</b></div>
            </Card>

            <Card title="Actions">
              <div style={{ display: "grid", gap: 8 }}>
                {!locked && (
                  <>
                    <Btn onClick={() => save()} busy={busy === "save"} icon={<FiSave />}>Save Draft</Btn>
                    {bill.status !== "GENERATED" && (
                      <Btn dark onClick={() => save("generate")} busy={busy === "generate"} icon={<FiCheckCircle />}>Mark as Generated</Btn>
                    )}
                  </>
                )}
                <Btn onClick={makePdf} busy={busy === "pdf"} icon={<FiFileText />} disabled={!isSaved && locked}>
                  {bill.pdfUrl ? "Regenerate PDF" : "Generate PDF"}
                </Btn>
                <Btn onClick={downloadPdf} busy={busy === "download"} icon={<FiDownload />} disabled={(!isSaved && locked) || (!!busy && busy !== "download")}>
                  Download PDF
                </Btn>
                {bill.status === "GENERATED" && (
                  <Btn danger onClick={cancel} busy={busy === "cancel"} icon={<FiXCircle />}>Cancel E-Way Bill</Btn>
                )}
              </div>
            </Card>

            <Card title="Send to Customer">
              {bill.status === "GENERATED" ? (
                <>
                  <Field label="Customer Email">
                    <input style={S.input} type="email" placeholder="customer@example.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
                  </Field>
                  <div style={{ marginTop: 8 }}>
                    <Btn dark onClick={sendEmail} busy={busy === "email"} icon={<FiSend />} disabled={!emailTo.trim() || (!!busy && busy !== "email")}>
                      {bill.sentAt ? "Resend E-Way Bill" : "Send E-Way Bill"}
                    </Btn>
                  </div>
                  <p style={S.hint}>A fresh PDF with the latest details is attached automatically.</p>
                  {bill.sentAt && (
                    <>
                      <div style={S.kv}><span>Last sent to</span><b style={{ wordBreak: "break-all", textAlign: "right" }}>{bill.sentTo || "—"}</b></div>
                      <div style={S.kv}><span>Sent on</span><b>{dt(bill.sentAt)}</b></div>
                    </>
                  )}
                </>
              ) : (
                <p style={{ ...S.hint, margin: 0 }}>Enter the E-Way Bill No. and mark it as generated to send it to the customer.</p>
              )}
            </Card>
          </div>
        </div>
        <style jsx>{`
          @media (max-width: 991px) {
            .ewb-layout { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}

const Card = ({ title, children }) => (
  <div style={S.card}>
    <div style={S.cardTitle}>{title}</div>
    {children}
  </div>
);
const Field = ({ label, children, wide }) => (
  <label style={{ display: "block", gridColumn: wide ? "1 / -1" : undefined }}>
    <span style={S.label}>{label}</span>
    {children}
  </label>
);
const Info = ({ label, value }) => (
  <div>
    <span style={S.label}>{label}</span>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{value || "—"}</div>
  </div>
);
const Btn = ({ children, icon, busy, dark, danger, ...props }) => (
  <button
    {...props}
    disabled={busy || props.disabled}
    style={{
      ...S.btn,
      ...(dark ? { background: "#111", color: "#fff", borderColor: "#111" } : {}),
      ...(danger ? { color: "#b91c1c", borderColor: "#fecaca" } : {}),
      opacity: busy || props.disabled ? 0.55 : 1,
    }}
  >
    {icon} {busy ? "Please wait…" : children}
  </button>
);

const S = {
  topbar: { background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
  burger: { background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 },
  topBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", background: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "#111", marginBottom: 14 },
  sub: { fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "18px 0 10px", paddingTop: 14, borderTop: "1px dashed #e5e7eb" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #e5e5e5", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" },
  hint: { fontSize: 11, color: "#6b7280", margin: "6px 0 12px" },
  th: { textAlign: "left", padding: "8px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#6b7280", borderBottom: "1px solid #eee", whiteSpace: "nowrap" },
  td: { padding: "8px 8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  kv: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid #f3f4f6", color: "#6b7280" },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" },
};
