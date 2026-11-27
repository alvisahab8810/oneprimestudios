// components/admin-panel/OptionImagesField.js
// Photos for one attribute option, e.g. the "Red" value of a "Colour"
// attribute. When a buyer picks that option, the product page shows these
// photos. Leaving it empty keeps the product's normal images.
import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const MAX_IMAGES = 8;

export default function OptionImagesField({ images = [], onChange, optionLabel = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const list = Array.isArray(images) ? images.filter(Boolean) : [];

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const room = MAX_IMAGES - list.length;
    if (room <= 0) {
      toast.error(`An option can have up to ${MAX_IMAGES} images`);
      return;
    }
    const chosen = files.slice(0, room);
    if (files.length > room) toast(`Only the first ${room} image(s) were added`);

    const fd = new FormData();
    chosen.forEach((f) => fd.append("images", f));
    setUploading(true);
    try {
      const res = await axios.post("/api/admin/products/option-images", fd, { withCredentials: true });
      onChange([...list, ...(res.data?.images || [])]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not upload the images");
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  const makeFirst = (idx) => {
    if (idx === 0) return;
    const next = [...list];
    const [img] = next.splice(idx, 1);
    onChange([img, ...next]);
  };

  return (
    <div className="ms-2 mt-2">
      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
        <small className="text-muted fw-semibold">
          Option images (optional){optionLabel ? ` for "${optionLabel}"` : ""}:
        </small>
        <button
          type="button"
          className="btn btn-xs btn-outline-secondary"
          style={{ fontSize: 11, padding: "1px 8px" }}
          disabled={uploading || list.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "+ Add Images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={pick}
        />
      </div>

      {list.length > 0 ? (
        <div className="d-flex flex-wrap gap-2">
          {list.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              style={{
                position: "relative",
                width: 64,
                height: 64,
                border: idx === 0 ? "2px solid #0d6efd" : "1px solid #ddd",
                borderRadius: 6,
                overflow: "hidden",
                background: "#fff",
              }}
              title={idx === 0 ? "First image (shown first)" : "Click to show this image first"}
            >
              <img
                src={src}
                alt={`option-${idx}`}
                onClick={() => makeFirst(idx)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: idx === 0 ? "default" : "pointer" }}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Remove image"
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  lineHeight: "14px",
                  fontSize: 12,
                  padding: 0,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <small className="text-muted" style={{ fontSize: 11 }}>
          No images. The product&apos;s main images are shown for this option.
        </small>
      )}
    </div>
  );
}
