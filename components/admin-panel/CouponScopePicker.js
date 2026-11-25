"use client";
// Chooses what a coupon applies to: every product, selected products, or every
// product inside selected categories. Only the list for the chosen option is
// kept, so a coupon is never left with a hidden restriction.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import CouponProductPicker from "@/components/admin-panel/CouponProductPicker";

const MODES = [
  { key: "all", label: "All products" },
  { key: "products", label: "Selected products" },
  { key: "categories", label: "Selected categories" },
];

const idOf = (item) => String(item?._id || item || "");

export default function CouponScopePicker({
  products = [],
  categories = [],
  onProductsChange,
  onCategoriesChange,
  onModeChange,
}) {
  const [mode, setMode] = useState(() =>
    categories.length ? "categories" : products.length ? "products" : "all"
  );
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (mode !== "categories" || allCategories.length) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    axios
      .get("/api/categories/list")
      .then((res) => {
        if (!cancelled) setAllCategories(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, allCategories.length]);

  const chooseMode = (next) => {
    setMode(next);
    if (onModeChange) onModeChange(next);
    if (next !== "products") onProductsChange([]);
    if (next !== "categories") onCategoriesChange([]);
  };

  // Main categories first, each followed by its sub-categories
  const rows = useMemo(() => {
    const known = new Set(allCategories.map((c) => String(c._id)));
    const parentOf = (c) => {
      const parent = idOf(c.parent);
      return parent && known.has(parent) ? parent : "";
    };
    const out = [];
    const addChildren = (parentId, depth) => {
      if (depth > 5) return;
      allCategories
        .filter((c) => parentOf(c) === parentId)
        .forEach((c) => {
          out.push({ _id: String(c._id), name: c.name, depth });
          addChildren(String(c._id), depth + 1);
        });
    };
    addChildren("", 0);
    return out;
  }, [allCategories]);

  const term = filter.trim().toLowerCase();
  const visibleRows = term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : rows;
  const selectedIds = categories.map(idOf);

  const toggle = (row) => {
    if (selectedIds.includes(row._id)) {
      onCategoriesChange(categories.filter((c) => idOf(c) !== row._id));
    } else {
      onCategoriesChange([...categories, { _id: row._id, name: row.name }]);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2" role="radiogroup" aria-label="Coupon applies to">
        {MODES.map((m) => {
          const on = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => chooseMode(m.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                border: on ? "1.5px solid #E10600" : "1.5px solid #d1d5db",
                background: on ? "#fdeaea" : "#fff",
                color: on ? "#E10600" : "#111111",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {mode === "all" && (
        <span className="text-muted small">This coupon works on every product.</span>
      )}

      {mode === "products" && (
        <CouponProductPicker selected={products} onChange={onProductsChange} />
      )}

      {mode === "categories" && (
        <div>
          <input
            id="coupon-category-filter"
            type="text"
            className="form-control"
            placeholder="Search a category"
            aria-label="Search a category"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div
            className="border rounded bg-white mt-2"
            style={{ maxHeight: 240, overflowY: "auto", padding: "6px 0" }}
          >
            {loading && <div className="px-3 py-2 text-muted small">Loading categories...</div>}
            {failed && (
              <div className="px-3 py-2 small" style={{ color: "#E10600" }}>
                Could not load the categories. Close this form and try again.
              </div>
            )}
            {!loading && !failed && visibleRows.length === 0 && (
              <div className="px-3 py-2 text-muted small">No categories found</div>
            )}
            {!loading &&
              visibleRows.map((row) => (
                <label
                  key={row._id}
                  className="d-flex align-items-center gap-2 mb-0"
                  style={{
                    padding: "6px 12px",
                    paddingLeft: 12 + (term ? 0 : row.depth * 20),
                    fontSize: 14,
                    cursor: "pointer",
                    color: "#111111",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row._id)}
                    onChange={() => toggle(row)}
                  />
                  <span style={{ fontWeight: row.depth === 0 ? 600 : 400 }}>{row.name}</span>
                </label>
              ))}
          </div>

          <div className="d-flex flex-wrap gap-2 mt-2">
            {categories.length === 0 && (
              <span className="small" style={{ color: "#E10600" }}>
                Select at least one category.
              </span>
            )}
            {categories.map((c) => (
              <span
                key={idOf(c)}
                className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded"
                style={{ background: "#f1f1f1", fontSize: 13 }}
              >
                {c?.name || rows.find((r) => r._id === idOf(c))?.name || idOf(c)}
                <button
                  type="button"
                  className="btn btn-sm p-0 border-0 bg-transparent"
                  style={{ color: "#E10600", lineHeight: 1 }}
                  onClick={() => onCategoriesChange(categories.filter((x) => idOf(x) !== idOf(c)))}
                  aria-label="Remove category"
                >
                  &#10005;
                </button>
              </span>
            ))}
          </div>

          <div className="text-muted small mt-1">
            The coupon works on every product in the selected categories,
            including the products in their sub-categories.
          </div>
        </div>
      )}
    </div>
  );
}
