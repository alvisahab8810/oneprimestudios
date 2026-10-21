"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  checkMedia,
  formatBytes,
} from "@/lib/actionMediaRules";

export default function ActionMediaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [alt, setAlt] = useState("");

  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/action-media", {
        withCredentials: true,
      });
      setItems(res.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the slider");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Checked here as well so an oversized file is never sent over the wire
    const problem = checkMedia({
      mime: file.type,
      filename: file.name,
      size: file.size,
    });

    if (problem) {
      toast.error(problem);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    try {
      setUploading(true);

      const body = new FormData();
      body.append("file", file);

      const up = await axios.post("/api/admin/action-media/upload", body, {
        withCredentials: true,
      });

      await axios.post(
        "/api/admin/action-media",
        {
          type: up.data.type,
          src: up.data.src,
          size: up.data.size,
          alt: alt.trim(),
        },
        { withCredentials: true }
      );

      toast.success("Added to the slider");
      setAlt("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const patchItem = async (item, patch) => {
    try {
      setBusyId(item._id);
      await axios.patch(`/api/admin/action-media/${item._id}`, patch, {
        withCredentials: true,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
      load();
    } finally {
      setBusyId("");
    }
  };

  // Order is stored as a number, so a move is a swap of two neighbours
  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const a = items[index];
    const b = items[target];

    try {
      setBusyId(a._id);
      await Promise.all([
        axios.patch(`/api/admin/action-media/${a._id}`, { order: b.order }, { withCredentials: true }),
        axios.patch(`/api/admin/action-media/${b._id}`, { order: a.order }, { withCredentials: true }),
      ]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reorder");
      load();
    } finally {
      setBusyId("");
    }
  };

  const removeItem = async (item) => {
    if (!confirm("Remove this from the slider? The file is deleted from the server.")) return;

    try {
      setBusyId(item._id);
      await axios.delete(`/api/admin/action-media/${item._id}`, {
        withCredentials: true,
      });
      toast.success("Removed");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove");
    } finally {
      setBusyId("");
    }
  };

  const liveCount = items.filter((i) => i.isActive).length;

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad">
        <h2 className="dashboard-main-h">See it in Action</h2>
        <p className="text-muted" style={{ fontSize: 13 }}>
          Photos and videos for the slider on the homepage. They appear in the
          order below, and {liveCount} of {items.length} are live right now.
        </p>

        {/* UPLOAD */}
        <div className="card p-3 mb-4">
          <h6 className="fw-semibold mb-2">Add a photo or video</h6>

          <ul className="text-muted mb-3" style={{ fontSize: 13, paddingLeft: 18 }}>
            <li>Photos: WebP only, up to {formatBytes(IMAGE_MAX_BYTES)}</li>
            <li>Videos: MP4 or WebM, up to {formatBytes(VIDEO_MAX_BYTES)}</li>
            <li>Videos play on their own and loop; the slider never moves by itself</li>
          </ul>

          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                Description (optional)
              </label>
              <input
                className="form-control"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="e.g. Offset press run"
                maxLength={160}
              />
            </div>

            <div className="col-md-5">
              <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                File
              </label>
              <input
                ref={fileRef}
                type="file"
                className="form-control"
                accept=".webp,image/webp,.mp4,video/mp4,.webm,video/webm"
                disabled={uploading}
                onChange={handleUpload}
              />
            </div>

            <div className="col-md-2">
              {uploading && (
                <span className="text-muted" style={{ fontSize: 13 }}>
                  Uploading...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted">
            Nothing uploaded yet. Until something is added, the homepage shows
            its three built-in photos.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>Order</th>
                  <th style={{ width: 170 }}>Preview</th>
                  <th>Description</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ width: 100 }}>Size</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 200 }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item._id}>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          disabled={index === 0 || busyId === item._id}
                          onClick={() => move(index, -1)}
                          aria-label="Move up"
                        >
                          &uarr;
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          disabled={index === items.length - 1 || busyId === item._id}
                          onClick={() => move(index, 1)}
                          aria-label="Move down"
                        >
                          &darr;
                        </button>
                      </div>
                    </td>

                    <td>
                      {item.type === "video" ? (
                        <video
                          src={item.src}
                          style={{ width: 150, height: 75, objectFit: "cover", borderRadius: 8, background: "#111" }}
                          muted
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.src}
                          alt={item.alt || ""}
                          style={{ width: 150, height: 75, objectFit: "cover", borderRadius: 8 }}
                        />
                      )}
                    </td>

                    <td>
                      <input
                        className="form-control form-control-sm"
                        defaultValue={item.alt || ""}
                        maxLength={160}
                        placeholder="Describe this slide"
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next !== (item.alt || "")) patchItem(item, { alt: next });
                        }}
                      />
                    </td>

                    <td className="text-capitalize">{item.type}</td>

                    <td>{item.size ? formatBytes(item.size) : "-"}</td>

                    <td>
                      {item.isActive ? (
                        <span className="badge bg-success">Live</span>
                      ) : (
                        <span className="badge bg-secondary">Hidden</span>
                      )}
                    </td>

                    <td>
                      <div className="d-flex flex-column gap-1">
                        <button
                          className={
                            item.isActive
                              ? "btn btn-sm btn-outline-warning"
                              : "btn btn-sm btn-outline-success"
                          }
                          disabled={busyId === item._id}
                          onClick={() => patchItem(item, { isActive: !item.isActive })}
                        >
                          {item.isActive ? "Hide" : "Show"}
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === item._id}
                          onClick={() => removeItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
