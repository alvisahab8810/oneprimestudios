"use client";
// Picks the products a coupon is limited to. Nothing selected means the coupon
// works on the whole cart, which is how every coupon behaved before this.
import { useEffect, useRef, useState } from "react";
import axios from "axios";

export default function CouponProductPicker({ selected = [], onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Close the result list when the admin clicks away from the picker
  useEffect(() => {
    const away = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/products/admin/list", {
          params: { search: term, limit: 12, page: 1 },
        });
        if (!cancelled) setResults(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const ids = selected.map((p) => String(p?._id || p));

  const add = (product) => {
    if (ids.includes(String(product._id))) return;
    onChange([...selected, { _id: String(product._id), name: product.name }]);
    setQuery("");
  };

  const remove = (id) => {
    onChange(selected.filter((p) => String(p?._id || p) !== String(id)));
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        type="text"
        className="form-control"
        placeholder="Search a product to limit this coupon to"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />

      {open && (
        <div
          className="border rounded bg-white shadow-sm"
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {loading && <div className="px-3 py-2 text-muted small">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-muted small">No products found</div>
          )}
          {!loading &&
            results.map((product) => {
              const picked = ids.includes(String(product._id));
              return (
                <button
                  key={product._id}
                  type="button"
                  className="btn btn-link text-decoration-none d-block w-100 text-start px-3 py-2"
                  style={{ color: picked ? "#999" : "#111111" }}
                  disabled={picked}
                  onClick={() => add(product)}
                >
                  <span className="d-block" style={{ fontSize: 14 }}>
                    {product.name}
                  </span>
                  <span className="d-block text-muted" style={{ fontSize: 12 }}>
                    {product.category?.name || "Uncategorised"}
                    {picked ? " — already added" : ""}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mt-2">
        {selected.length === 0 && (
          <span className="text-muted small">
            No product selected — this coupon works on every product.
          </span>
        )}
        {selected.map((p) => (
          <span
            key={String(p?._id || p)}
            className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded"
            style={{ background: "#f1f1f1", fontSize: 13 }}
          >
            {p?.name || String(p?._id || p)}
            <button
              type="button"
              className="btn btn-sm p-0 border-0 bg-transparent"
              style={{ color: "#E10600", lineHeight: 1 }}
              onClick={() => remove(p?._id || p)}
              aria-label="Remove product"
            >
              &#10005;
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
