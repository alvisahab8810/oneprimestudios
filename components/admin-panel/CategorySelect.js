// components/admin-panel/CategorySelect.js
// Drop-in replacement for the flat category <select> in add-product & edit-product.
// Shows: Parent categories as disabled group headers, subcategories as selectable options.
// If a parent has no children it is itself selectable.
// Usage:
//   <CategorySelect value={form.categoryId} onChange={(id) => setForm(f => ({ ...f, categoryId: id }))} />

import { useEffect, useState } from "react";
import axios from "axios";

export default function CategorySelect({ value, onChange, className = "form-select mb-2" }) {
  const [grouped, setGrouped] = useState([]); // top-level cats with children

  useEffect(() => {
    const load = async () => {
      try {
        // withChildren=true → returns [ { ...parent, children: [...] }, ... ]
        const res = await axios.get("/api/categories?withChildren=true");
        setGrouped(res.data || []);
      } catch (err) {
        console.error("CategorySelect fetch error:", err);
      }
    };
    load();
  }, []);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">Select Category</option>

      {grouped.map((parent) => {
        const children = parent.children || [];

        if (children.length === 0) {
          // Parent has no subcategories → selectable directly
          return (
            <option key={parent._id} value={parent._id}>
              {parent.name}
            </option>
          );
        }

        // Parent has subcategories → use <optgroup>
        return (
          <optgroup key={parent._id} label={`── ${parent.name} ──`}>
            {children.map((child) => (
              <option key={child._id} value={child._id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}