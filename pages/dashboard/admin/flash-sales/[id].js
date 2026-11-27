// pages/dashboard/admin/flash-sales/[id].js — create or edit one flash sale.
// /dashboard/admin/flash-sales/new creates; any other id edits.
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaSearch, FaTimes, FaArrowLeft } from "react-icons/fa";
import { dealStatus, regularBatchPrice } from "@/lib/flashPricing";

const INPUT = { height: 40, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14, background: "#fff", boxSizing: "border-box", width: "100%" };
const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: 20 };
const LABEL = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" };
const HINT = { fontSize: 12, color: "#6b7280", marginTop: 4 };

// <input type="datetime-local"> works in the browser's local time
const toLocalInput = (d) => {
  const date = new Date(d);
  if (!Number.isFinite(date.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : "");

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const blank = () => {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return {
    title: "",
    slug: "",
    subtitle: "",
    dealPrice: "",
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
    enabled: true,
    showOnHome: true,
    products: [],
  };
};

const STATUS_TEXT = {
  live: { text: "Live now", color: "#15803d", bg: "#dcfce7" },
  scheduled: { text: "Scheduled", color: "#4338ca", bg: "#e0e7ff" },
  ended: { text: "Ended", color: "#6b7280", bg: "#f3f4f6" },
  off: { text: "Switched off", color: "#b91c1c", bg: "#fee2e2" },
};

// Search box that adds retail products to the deal
function ProductAdder({ chosenIds, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/products/admin/list", { params: { search: term, limit: 15 } });
        setResults((data.data || []).filter((p) => (p.productFor || "both") !== "b2b"));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <FaSearch size={13} color="#9ca3af" style={{ position: "absolute", left: 12, top: 13 }} />
        <input
          id="fs-product-search"
          style={{ ...INPUT, paddingLeft: 34 }}
          placeholder="Search retail products by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, maxHeight: 320, overflowY: "auto" }}>
          {loading && <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>No retail products match.</div>}
          {results.map((p) => {
            const added = chosenIds.has(String(p._id));
            return (
              <button
                key={p._id}
                type="button"
                disabled={added}
                onClick={() => onAdd([p])}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "8px 12px", border: 0, borderBottom: "1px solid #f3f4f6", background: added ? "#f9fafb" : "#fff", cursor: added ? "default" : "pointer", textAlign: "left" }}
              >
                <img src={p.mainImage || "/placeholder.png"} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
                <span style={{ flex: 1, fontSize: 13 }}>
                  {p.name}
                  <span style={{ display: "block", fontSize: 11.5, color: "#6b7280" }}>
                    {rupees(regularBatchPrice(p))} for {p.minOrderQty || 1} · {p.status === "published" ? "Published" : "Draft"}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: added ? "#9ca3af" : "#E10600", fontWeight: 600 }}>{added ? "Added" : "Add"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Adds every retail product of one category in one go
function CategoryAdder({ onAdd }) {
  const [categories, setCategories] = useState([]);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios
      .get("/api/categories/list")
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  const addAll = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const { data } = await axios.get("/api/products/admin/list", { params: { category: picked, limit: 200 } });
      const list = (data.data || []).filter((p) => (p.productFor || "both") !== "b2b");
      if (!list.length) toast("That category has no retail products");
      else onAdd(list);
    } catch {
      toast.error("Could not load that category's products");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select id="fs-category" style={{ ...INPUT, flex: 1 }} value={picked} onChange={(e) => setPicked(e.target.value)}>
        <option value="">Add all products from a category...</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
      <button type="button" onClick={addAll} disabled={!picked || busy} style={{ height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #E10600", background: "#fff", color: "#E10600", fontWeight: 600, cursor: picked ? "pointer" : "default", whiteSpace: "nowrap" }}>
        {busy ? "Adding..." : "Add all"}
      </button>
    </div>
  );
}

export default function FlashSaleEditor() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === "new";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (isNew) {
      setLoading(false);
      return;
    }
    axios
      .get(`/api/admin/flash-sales/${id}`, { withCredentials: true })
      .then(({ data }) => {
        const s = data.data;
        setForm({
          title: s.title || "",
          slug: s.slug || "",
          subtitle: s.subtitle || "",
          dealPrice: s.dealPrice ?? "",
          startsAt: toLocalInput(s.startsAt),
          endsAt: toLocalInput(s.endsAt),
          enabled: s.enabled !== false,
          showOnHome: s.showOnHome !== false,
          products: (s.products || []).map((p) => ({ product: p.product, price: p.price ?? "" })),
        });
        setSlugTouched(true);
      })
      .catch((err) => {
        if (err?.response?.status === 401) router.replace("/dashboard/admin/login");
        else toast.error(err?.response?.data?.message || "Could not load the flash sale");
      })
      .finally(() => setLoading(false));
  }, [router.isReady, id]);

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setTitle = (e) => {
    const title = e.target.value;
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60),
    }));
  };

  const chosenIds = new Set(form.products.map((r) => String(r.product._id)));
  const addProducts = (list) => {
    const fresh = list.filter((p) => !chosenIds.has(String(p._id)));
    if (!fresh.length) {
      toast("Those products are already in the deal");
      return;
    }
    setForm((f) => ({ ...f, products: [...f.products, ...fresh.map((p) => ({ product: p, price: "" }))] }));
    toast.success(`${fresh.length} product${fresh.length > 1 ? "s" : ""} added`);
  };
  const removeProduct = (pid) => setForm((f) => ({ ...f, products: f.products.filter((r) => String(r.product._id) !== String(pid)) }));
  const setRowPrice = (pid, price) =>
    setForm((f) => ({ ...f, products: f.products.map((r) => (String(r.product._id) === String(pid) ? { ...r, price } : r)) }));

  // Quick end times measured from now (or from the start, if that is later)
  const endIn = (hours) => {
    const start = new Date(form.startsAt).getTime();
    const base = Math.max(Date.now(), Number.isFinite(start) ? start : 0);
    setForm((f) => ({ ...f, endsAt: toLocalInput(new Date(base + hours * 3600 * 1000)) }));
  };
  const startNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    setForm((f) => ({ ...f, startsAt: toLocalInput(now) }));
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Enter a title for the deal");
    if (!(Number(form.dealPrice) >= 1)) return toast.error("Enter a deal price");
    if (!form.products.length) return toast.error("Add at least one product");
    setSaving(true);
    try {
      const body = {
        ...form,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
        products: form.products.map((r) => ({ product: r.product._id, price: r.price === "" ? null : r.price })),
      };
      if (isNew) {
        const { data } = await axios.post("/api/admin/flash-sales", body, { withCredentials: true });
        toast.success("Flash sale created");
        router.replace(`/dashboard/admin/flash-sales/${data.data._id}`);
      } else {
        const { data } = await axios.put(`/api/admin/flash-sales/${id}`, body, { withCredentials: true });
        const st = data?.data?.status;
        toast.success(st === "live" ? "Saved. The deal is live." : st === "scheduled" ? "Saved. The deal will start on time." : "Saved");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the flash sale");
    } finally {
      setSaving(false);
    }
  };

  const preview = dealStatus({ enabled: form.enabled, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) });
  const st = STATUS_TEXT[preview] || STATUS_TEXT.off;
  const quick = { height: 30, padding: "0 10px", borderRadius: 999, border: "1px solid #e0e0e0", background: "#fff", fontSize: 12, cursor: "pointer" };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <Link href="/dashboard/admin/flash-sales" style={{ color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}>
            <FaArrowLeft size={11} /> Flash Sales
          </Link>
          <span style={{ fontWeight: 600, fontSize: 18 }}>{isNew ? "New flash sale" : "Edit flash sale"}</span>
          <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{st.text}</span>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            style={{ marginLeft: "auto", height: 38, padding: "0 18px", borderRadius: 8, border: 0, background: "#E10600", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : isNew ? "Create flash sale" : "Save changes"}
          </button>
        </nav>

        {loading ? (
          <p style={{ padding: 24, color: "#6b7280" }}>Loading...</p>
        ) : (
          <div style={{ padding: 24, display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)", maxWidth: 1100 }}>
            <div style={CARD}>
              <h6 style={{ fontWeight: 700, marginBottom: 16 }}>Deal details</h6>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                <div>
                  <label htmlFor="fs-title" style={LABEL}>Title</label>
                  <input id="fs-title" style={INPUT} value={form.title} onChange={setTitle} placeholder="Everything at ₹399" maxLength={80} />
                </div>
                <div>
                  <label htmlFor="fs-slug" style={LABEL}>Page link</label>
                  <input
                    id="fs-slug"
                    style={INPUT}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug")(e);
                    }}
                    placeholder="everything-at-399"
                    maxLength={60}
                  />
                  <div style={HINT}>/flash-sale/{form.slug || "..."}</div>
                  <div style={HINT}>A retail category with the same link name also shows these deal products while the deal is live.</div>
                </div>
                <div>
                  <label htmlFor="fs-price" style={LABEL}>Deal price (₹)</label>
                  <input id="fs-price" type="number" min="1" step="1" style={INPUT} value={form.dealPrice} onChange={set("dealPrice")} placeholder="399" />
                  <div style={HINT}>For one minimum-order batch of each product, like the sale price. Products can have their own price below.</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label htmlFor="fs-subtitle" style={LABEL}>Short line under the title (optional)</label>
                <input id="fs-subtitle" style={INPUT} value={form.subtitle} onChange={set("subtitle")} placeholder="Today only. Prices go back up when the timer ends." maxLength={160} />
              </div>
            </div>

            <div style={CARD}>
              <h6 style={{ fontWeight: 700, marginBottom: 4 }}>Timer</h6>
              <p style={{ ...HINT, marginTop: 0, marginBottom: 16 }}>
                The deal runs from the start time to the end time. When it ends, the section and the deal price disappear by themselves. To run it again, set a new end time and save.
              </p>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                <div>
                  <label htmlFor="fs-start" style={LABEL}>Starts</label>
                  <input id="fs-start" type="datetime-local" style={INPUT} value={form.startsAt} onChange={set("startsAt")} />
                  <div style={{ marginTop: 8 }}>
                    <button type="button" style={quick} onClick={startNow}>Start now</button>
                  </div>
                </div>
                <div>
                  <label htmlFor="fs-end" style={LABEL}>Ends</label>
                  <input id="fs-end" type="datetime-local" style={INPUT} value={form.endsAt} onChange={set("endsAt")} />
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[[2, "2 hours"], [6, "6 hours"], [24, "24 hours"], [72, "3 days"], [168, "7 days"]].map(([h, l]) => (
                      <button key={h} type="button" style={quick} onClick={() => endIn(h)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
                <label htmlFor="fs-enabled" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                  <input id="fs-enabled" type="checkbox" checked={form.enabled} onChange={set("enabled")} /> Deal is on
                </label>
                <label htmlFor="fs-home" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                  <input id="fs-home" type="checkbox" checked={form.showOnHome} onChange={set("showOnHome")} /> Show on the home page
                </label>
              </div>
            </div>

            <div style={CARD}>
              <h6 style={{ fontWeight: 700, marginBottom: 4 }}>Products ({form.products.length})</h6>
              <p style={{ ...HINT, marginTop: 0, marginBottom: 16 }}>Only retail (B2C) products can be added. Draft products stay hidden from shoppers until they are published.</p>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", marginBottom: 16 }}>
                <ProductAdder chosenIds={chosenIds} onAdd={addProducts} />
                <CategoryAdder onAdd={addProducts} />
              </div>

              {form.products.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#6b7280", border: "1px dashed #e5e7eb", borderRadius: 10, fontSize: 13 }}>
                  No products yet. Search above or add a whole category.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table mb-0" style={{ fontSize: 13, minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        <th style={{ padding: "10px 12px" }}>Product</th>
                        <th>Normal price</th>
                        <th style={{ width: 170 }}>Own deal price</th>
                        <th>Shopper pays</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {form.products.map((r) => {
                        const p = r.product;
                        const regular = regularBatchPrice(p);
                        const wanted = r.price !== "" && r.price !== null ? Number(r.price) : Number(form.dealPrice);
                        const pays = wanted > 0 ? (regular > 0 ? Math.min(wanted, regular) : wanted) : regular;
                        const noSaving = wanted > 0 && regular > 0 && wanted >= regular;
                        return (
                          <tr key={p._id}>
                            <td style={{ padding: "8px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <img src={p.mainImage || "/placeholder.png"} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                                  <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                    Min. order {p.minOrderQty || 1}
                                    {p.status && p.status !== "published" ? " · Draft (hidden)" : ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>{rupees(regular)}</td>
                            <td>
                              <input
                                id={`fs-row-price-${p._id}`}
                                type="number"
                                min="1"
                                step="1"
                                style={{ ...INPUT, height: 34 }}
                                value={r.price}
                                placeholder={form.dealPrice ? `${form.dealPrice} (deal)` : "Deal price"}
                                onChange={(e) => setRowPrice(p._id, e.target.value)}
                                aria-label={`Own deal price for ${p.name}`}
                              />
                            </td>
                            <td>
                              <strong style={{ color: noSaving ? "#6b7280" : "#E10600" }}>{rupees(pays)}</strong>
                              {noSaving && <div style={{ fontSize: 11, color: "#b45309" }}>No saving: deal is not below the normal price</div>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button type="button" onClick={() => removeProduct(p._id)} aria-label={`Remove ${p.name}`} style={{ background: "none", border: 0, color: "#9ca3af", cursor: "pointer" }}>
                                <FaTimes />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
