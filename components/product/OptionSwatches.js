// components/product/OptionSwatches.js
// Small photo buttons under a dropdown attribute (for example Colour) whose
// options have their own images. Picking one selects that option, the same
// as choosing it in the dropdown. Renders nothing when no option has images.
export default function OptionSwatches({ attr, selected, onPick }) {
  const values = (attr?.values || []).filter((v) => Array.isArray(v.images) && v.images.length > 0);
  if (!values.length) return null;

  return (
    <div className="d-flex flex-wrap gap-2 mt-2" role="group" aria-label={`${attr.name} options`}>
      {values.map((v) => {
        const active = selected === v.label;
        return (
          <button
            key={v.label}
            type="button"
            title={v.label}
            aria-pressed={active}
            onClick={() => onPick(active ? "" : v.label)}
            style={{
              width: 48,
              height: 48,
              padding: 0,
              borderRadius: 6,
              overflow: "hidden",
              background: "#fff",
              border: active ? "2px solid #111" : "1px solid #ddd",
              boxShadow: active ? "0 0 0 2px #fff inset" : "none",
              cursor: "pointer",
            }}
          >
            <img src={v.images[0]} alt={v.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        );
      })}
    </div>
  );
}
