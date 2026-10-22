"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  SECTIONS,
  DEFAULT_SECTION,
  getSection,
  sectionKind,
  sectionHint,
  acceptAttr,
  checkMedia,
  formatBytes,
} from "@/lib/actionMediaRules";

// What the "add the built-in content" button offers in each section
const SEED_LABEL = {
  action: "Add the 3 built-in photos",
  "hero-desktop": "Use the current banner",
  "hero-mobile": "Use the current banner",
  "products-info": "Add the 3 current notices",
};

const emptyText = { tag: "", title: "", description: "" };

export default function SiteMediaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [section, setSection] = useState(DEFAULT_SECTION);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const [text, setText] = useState(emptyText);
  const [seeding, setSeeding] = useState(false);

  const fileRef = useRef(null);

  const info = getSection(section);
  const kind = sectionKind(section);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/action-media", {
        params: { section },
        withCredentials: true,
      });
      setItems(res.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load this list");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching areas starts the add form fresh
  const changeSection = (next) => {
    if (next === section) return;
    setSection(next);
    setItems([]);
    setAlt("");
    setLink("");
    setText(emptyText);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Checked here as well so an oversized file is never sent over the wire
    const problem = checkMedia({
      mime: file.type,
      filename: file.name,
      size: file.size,
      section,
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
        params: { section },
        withCredentials: true,
      });

      await axios.post(
        "/api/admin/action-media",
        {
          section,
          type: up.data.type,
          src: up.data.src,
          size: up.data.size,
          alt: alt.trim(),
          link: link.trim(),
        },
        { withCredentials: true }
      );

      toast.success("Added");
      setAlt("");
      setLink("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addNotice = async () => {
    if (!text.title.trim()) {
      toast.error("A notice needs a heading");
      return;
    }

    try {
      setUploading(true);
      await axios.post(
        "/api/admin/action-media",
        {
          section,
          type: "text",
          tag: text.tag.trim(),
          title: text.title.trim(),
          description: text.description.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Notice added");
      setText(emptyText);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add the notice");
    } finally {
      setUploading(false);
    }
  };

  // Each area falls back to what is built into the website until something is
  // listed here. This brings that content in as normal rows an admin can edit.
  const addDefaults = async () => {
    try {
      setSeeding(true);
      const res = await axios.post(
        "/api/admin/action-media/defaults",
        { section },
        { withCredentials: true }
      );
      toast.success(res.data.message || "Added");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add the content");
    } finally {
      setSeeding(false);
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
    const warning =
      kind === "text"
        ? "Remove this notice?"
        : "Remove this from the website? The file is deleted from the server.";
    if (!confirm(warning)) return;

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

  // A banner shows one image at a time, so the rest of the list is a queue
  const bannerNote =
    kind === "banner" && liveCount > 1
      ? "More than one banner is live, so they rotate as a slider."
      : "";

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad">
          <h2 className="dashboard-main-h">Banners &amp; Media</h2>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Everything on the website that you can change without a developer.
            Pick an area below.
          </p>

          {/* AREA TABS */}
          <ul className="nav nav-pills gap-2 mb-3">
            {SECTIONS.map((s) => (
              <li className="nav-item" key={s.id}>
                <button
                  type="button"
                  className={`nav-link ${s.id === section ? "active" : ""}`}
                  onClick={() => changeSection(s.id)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="alert alert-light border" style={{ fontSize: 13 }}>
            <strong>{info.label}</strong> — {info.where}. They appear in the order
            below, and {liveCount} of {items.length} are live right now.
            {bannerNote ? ` ${bannerNote}` : ""}
          </div>

          {/* ADD */}
          <div className="card p-3 mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <h6 className="fw-semibold mb-0">
                {kind === "text" ? "Add a notice" : "Add to this area"}
              </h6>

              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={seeding}
                onClick={addDefaults}
              >
                {seeding ? "Adding..." : SEED_LABEL[section] || "Add built-in content"}
              </button>
            </div>

            <p className="text-muted mb-3" style={{ fontSize: 13 }}>
              {info.label} shows only the list below once it has anything in it,
              so use that button to start from what the website shows today.{" "}
              {sectionHint(section)}
            </p>

            {kind === "text" ? (
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                    Small label (optional)
                  </label>
                  <input
                    className="form-control"
                    value={text.tag}
                    onChange={(e) => setText({ ...text, tag: e.target.value })}
                    placeholder="e.g. Bulk Orders"
                    maxLength={60}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                    Heading
                  </label>
                  <input
                    className="form-control"
                    value={text.title}
                    onChange={(e) => setText({ ...text, title: e.target.value })}
                    placeholder="e.g. Better Prices on Higher Quantities"
                    maxLength={120}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                    Details (optional)
                  </label>
                  <input
                    className="form-control"
                    value={text.description}
                    onChange={(e) => setText({ ...text, description: e.target.value })}
                    placeholder="One line of explanation"
                    maxLength={300}
                  />
                </div>

                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    disabled={uploading}
                    onClick={addNotice}
                  >
                    {uploading ? "Adding..." : "Add notice"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row g-2 align-items-end">
                <div className="col-md-4">
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

                {kind === "banner" && (
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                      Opens page (optional)
                    </label>
                    <input
                      className="form-control"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="/products"
                      maxLength={200}
                    />
                  </div>
                )}

                <div className={kind === "banner" ? "col-md-4" : "col-md-6"}>
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                    File
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="form-control"
                    accept={acceptAttr(section)}
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </div>

                <div className="col-md-1">
                  {uploading && (
                    <span className="text-muted" style={{ fontSize: 13 }}>
                      Uploading...
                    </span>
                  )}
                </div>
              </div>
            )}

            {kind === "media" && (
              <p className="text-muted mb-0 mt-2" style={{ fontSize: 13 }}>
                Videos play on their own and loop; the slider never moves by itself.
              </p>
            )}
          </div>

          {/* LIST */}
          {loading ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-muted">
              Nothing in the list yet, so the website keeps showing what is built
              into it.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 70 }}>Order</th>
                    {kind !== "text" && <th style={{ width: 170 }}>Preview</th>}
                    <th>{kind === "text" ? "Wording" : "Description"}</th>
                    {kind === "banner" && <th style={{ width: 160 }}>Opens page</th>}
                    {kind !== "text" && <th style={{ width: 100 }}>Size</th>}
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 120 }}>Action</th>
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

                      {kind !== "text" && (
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
                      )}

                      <td>
                        {kind === "text" ? (
                          <div className="d-flex flex-column gap-1">
                            <input
                              className="form-control form-control-sm"
                              defaultValue={item.tag || ""}
                              maxLength={60}
                              placeholder="Small label"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next !== (item.tag || "")) patchItem(item, { tag: next });
                              }}
                            />
                            <input
                              className="form-control form-control-sm fw-semibold"
                              defaultValue={item.title || ""}
                              maxLength={120}
                              placeholder="Heading"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next && next !== (item.title || "")) {
                                  patchItem(item, { title: next });
                                }
                              }}
                            />
                            <input
                              className="form-control form-control-sm"
                              defaultValue={item.description || ""}
                              maxLength={300}
                              placeholder="Details"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next !== (item.description || "")) {
                                  patchItem(item, { description: next });
                                }
                              }}
                            />
                          </div>
                        ) : (
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
                        )}
                      </td>

                      {kind === "banner" && (
                        <td>
                          <input
                            className="form-control form-control-sm"
                            defaultValue={item.link || ""}
                            maxLength={200}
                            placeholder="/products"
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next !== (item.link || "")) patchItem(item, { link: next });
                            }}
                          />
                        </td>
                      )}

                      {kind !== "text" && (
                        <td>{item.size ? formatBytes(item.size) : "-"}</td>
                      )}

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
