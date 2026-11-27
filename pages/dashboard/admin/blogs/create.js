// pages/dashboard/admin/blogs/create.js — create or edit a blog post (?id= to edit).
// Markdown editor with toolbar, split preview, AI writer, FAQs, JSON-LD schemas,
// publishing, robots and SEO settings.
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { mdToHtml, countWords } from "@/lib/markdown";
import {
  MdSave, MdVisibility, MdArrowBack, MdImage, MdClose, MdAdd,
  MdFormatBold, MdFormatItalic, MdFormatListBulleted, MdFormatListNumbered,
  MdLink, MdCode, MdCopyAll, MdFormatQuote, MdFormatColorText,
  MdAddPhotoAlternate, MdEdit, MdDeleteOutline, MdAutoAwesome, MdViewColumn,
} from "react-icons/md";

const RED = "#E10600";
const SITE_NAME = "One Prime Studios";
const BASE_URL = "https://oneprimestudios.com";
const LOGO_URL = `${BASE_URL}/assets/images/logo.png`;
const MAX_IMAGE = 6 * 1024 * 1024;

const SCHEMA_TYPES = [
  "BlogPosting", "Article", "NewsArticle", "BreadcrumbList", "FAQPage", "HowTo",
  "Product", "Organization", "LocalBusiness", "Event", "WebPage", "Person",
];

const PRESET_COLORS = [
  "#000000", "#374151", "#E10600", "#2563eb", "#16a34a", "#d97706",
  "#7c3aed", "#db2777", "#0891b2", "#ea580c", "#ffffff", "#9ca3af",
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 60, 72];

const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1";
const BLANK_SCHEMA = { type: "BlogPosting", content: "" };

const BLANK = {
  title: "", slug: "",
  coverImage: { src: null, alt: "" }, cardImage: { src: null, alt: "" },
  content: "", summary: "",
  schemas: [{ ...BLANK_SCHEMA }],
  faqs: [],
  status: "draft", publishDate: "", allowComments: true,
  categories: "", tags: "", metaTitle: "", metaKeywords: "", metaDescription: "",
  authorName: "", metaRobots: DEFAULT_ROBOTS, xRobotsTag: DEFAULT_ROBOTS,
};

function slugify(str) {
  return String(str || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

const today = () => new Date().toISOString().slice(0, 10);

/* ── Image upload box ── */
function ImgUpload({ id, value, onChange, hint }) {
  const ref = useRef(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);

  function readFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > MAX_IMAGE) return toast.error("Image too large. The limit is 6 MB.");
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target.result);
    r.readAsDataURL(file);
  }

  return (
    <div>
      {hint && <p style={{ ...s.hint, marginBottom: 6 }}>{hint}</p>}
      <div
        role="button"
        tabIndex={0}
        style={{ ...s.uploadArea, ...(value && !broken ? s.uploadHas : {}) }}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }}
      >
        {value && !broken ? (
          <>
            <img src={value} alt="Preview" style={s.uploadPreview} onError={() => setBroken(true)} />
            <button type="button" aria-label="Remove image" style={s.uploadRemove} onClick={(e) => { e.stopPropagation(); onChange(null); }}>
              <MdClose size={13} />
            </button>
          </>
        ) : (
          <div style={s.uploadPlaceholder}>
            <MdImage size={28} style={{ color: value && broken ? RED : "#9ca3af" }} />
            <span style={{ color: value && broken ? RED : "#9ca3af", fontSize: 12 }}>
              {value && broken ? "Image missing. Click to upload again." : "Click to upload or drag and drop"}
            </span>
          </div>
        )}
      </div>
      <input id={id} ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => readFile(e.target.files?.[0])} onClick={(e) => { e.target.value = ""; }} />
    </div>
  );
}

/* ── Toolbar helpers ── */
function insertAtCursor(el, set, prefix, suffix = "") {
  if (!el) return;
  const a = el.selectionStart, b = el.selectionEnd;
  const sel = el.value.slice(a, b);
  set(el.value.slice(0, a) + prefix + sel + suffix + el.value.slice(b));
  setTimeout(() => { el.focus(); el.setSelectionRange(a + prefix.length, b + prefix.length); }, 0);
}
function insertHeading(el, set, level) {
  if (!el) return;
  const v = el.value, p = el.selectionStart;
  const ls = v.lastIndexOf("\n", p - 1) + 1;
  const le = v.indexOf("\n", p);
  const end = le === -1 ? v.length : le;
  const clean = v.slice(ls, end).replace(/^#{1,6}\s*/, "");
  const nl = (level === 0 ? "" : "#".repeat(level) + " ") + clean;
  set(v.slice(0, ls) + nl + v.slice(end));
  setTimeout(() => { el.focus(); el.setSelectionRange(ls + nl.length, ls + nl.length); }, 0);
}
function insertSpan(el, set, style) {
  if (!el) return;
  const a = el.selectionStart, b = el.selectionEnd;
  const tag = `<span style="${style}">${el.value.slice(a, b) || "text"}</span>`;
  set(el.value.slice(0, a) + tag + el.value.slice(b));
  setTimeout(() => { el.focus(); el.setSelectionRange(a + tag.length, a + tag.length); }, 0);
}

/* ── JSON-LD builder ── */
function buildSchemaJson(type, form) {
  const postUrl = `${BASE_URL}/blogs/${form.slug || "post"}`;
  const desc = form.metaDescription || form.summary || "";
  const coverSrc = form.coverImage?.src;
  const imageUrl = coverSrc && !coverSrc.startsWith("data:")
    ? (coverSrc.startsWith("http") ? coverSrc : `${BASE_URL}${coverSrc}`) : null;
  const imageObj = imageUrl ? { "@type": "ImageObject", url: imageUrl, description: form.coverImage?.alt || form.title || "" } : null;
  const steps = (form.faqs || []).filter((f) => f.question);
  const published = form.publishDate || today();
  const org = { "@type": "Organization", name: SITE_NAME, url: BASE_URL, logo: { "@type": "ImageObject", url: LOGO_URL } };

  switch (type) {
    case "BreadcrumbList":
      return {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Blogs", item: `${BASE_URL}/blogs` },
          { "@type": "ListItem", position: 3, name: form.title || "Post", item: postUrl },
        ],
      };
    case "FAQPage":
      return {
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: steps.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer || "" } })),
      };
    case "HowTo":
      return {
        "@context": "https://schema.org", "@type": "HowTo", name: form.title || "", description: desc,
        ...(imageObj ? { image: imageObj } : {}),
        step: steps.map((f, i) => ({ "@type": "HowToStep", position: i + 1, name: f.question, text: f.answer || "" })),
      };
    case "WebPage":
      return {
        "@context": "https://schema.org", "@type": "WebPage", name: form.title || "", description: desc, url: postUrl,
        ...(imageObj ? { primaryImageOfPage: imageObj } : {}),
        author: { "@type": "Person", name: form.authorName || SITE_NAME },
        datePublished: published, dateModified: today(),
      };
    case "Organization":
      return { "@context": "https://schema.org", ...org, description: desc, sameAs: [] };
    case "Person":
      return { "@context": "https://schema.org", "@type": "Person", name: form.authorName || SITE_NAME, url: BASE_URL, description: desc };
    case "Event":
      return {
        "@context": "https://schema.org", "@type": "Event", name: form.title || "", description: desc, url: postUrl,
        ...(imageObj ? { image: imageObj } : {}),
        startDate: published, endDate: published,
        location: { "@type": "Place", name: form.categories || SITE_NAME },
        organizer: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      };
    case "Product":
      return {
        "@context": "https://schema.org", "@type": "Product", name: form.title || "", description: desc, url: postUrl,
        ...(imageObj ? { image: imageObj } : {}),
        brand: { "@type": "Brand", name: SITE_NAME },
      };
    case "LocalBusiness":
      return {
        "@context": "https://schema.org", "@type": "LocalBusiness", name: SITE_NAME, description: desc, url: BASE_URL,
        ...(imageObj ? { image: imageObj } : {}),
        address: { "@type": "PostalAddress", addressCountry: "IN" },
      };
    default: {
      // BlogPosting, Article, NewsArticle. Use the FAQPage type for FAQ markup.
      const schema = {
        "@context": "https://schema.org", "@type": type,
        headline: form.title || "", description: desc, url: postUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        author: { "@type": "Person", name: form.authorName || SITE_NAME },
        publisher: org,
        datePublished: published, dateModified: today(),
      };
      if (imageObj) schema.image = imageObj;
      return schema;
    }
  }
}

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export default function CreateBlogPage() {
  const router = useRouter();
  const editId = typeof router.query.id === "string" ? router.query.id : "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [contentMode, setContentMode] = useState("write");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiFillMeta, setAiFillMeta] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [linkModal, setLinkModal] = useState(null);

  const contentRef = useRef(null);
  const imgInsertRef = useRef(null);
  const headingRef = useRef(null);
  const fontSizeRef = useRef(null);
  const aiAbortRef = useRef(null);

  /* ── Load an existing blog ── */
  useEffect(() => {
    if (!router.isReady || !editId) return;
    setLoadingBlog(true);
    axios
      .get(`/api/admin/blogs/${editId}`, { withCredentials: true })
      .then(({ data }) => {
        const b = data?.blog;
        if (!b) return;
        const schemas = b.schemas?.length
          ? b.schemas.map((sc) => ({ type: sc.type || "BlogPosting", content: sc.content || "" }))
          : b.schema ? [{ type: b.schemaType || "BlogPosting", content: b.schema }] : [{ ...BLANK_SCHEMA }];
        setForm({
          ...BLANK,
          title: b.title || "",
          slug: b.slug || "",
          coverImage: { src: b.coverImage?.src || null, alt: b.coverImage?.alt || "" },
          cardImage: { src: b.cardImage?.src || null, alt: b.cardImage?.alt || "" },
          content: b.content || "",
          summary: b.summary || "",
          schemas,
          faqs: Array.isArray(b.faqs) ? b.faqs.map((f) => ({ question: f.question || "", answer: f.answer || "" })) : [],
          status: b.status || "draft",
          publishDate: b.publishDate || "",
          allowComments: b.allowComments !== false,
          categories: Array.isArray(b.categories) ? b.categories.join(", ") : "",
          tags: Array.isArray(b.tags) ? b.tags.join(", ") : "",
          metaTitle: b.metaTitle || "",
          metaKeywords: b.metaKeywords || "",
          metaDescription: b.metaDescription || "",
          authorName: b.authorName || "",
          metaRobots: b.metaRobots || DEFAULT_ROBOTS,
          xRobotsTag: b.xRobotsTag || DEFAULT_ROBOTS,
        });
        setSlugManual(true);
      })
      .catch((err) => toast.error(errMsg(err, "Could not load the blog.")))
      .finally(() => setLoadingBlog(false));
  }, [router.isReady, editId]);

  useEffect(() => {
    if (!showColors) return;
    const hide = () => setShowColors(false);
    document.addEventListener("click", hide);
    return () => document.removeEventListener("click", hide);
  }, [showColors]);

  // Stop a running AI request when leaving the page
  useEffect(() => () => aiAbortRef.current?.abort(), []);

  /* ── Form helpers ── */
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setImg = (field, k, v) => setForm((p) => ({ ...p, [field]: { ...p[field], [k]: v } }));
  const setContent = (v) => f("content", v);
  const handleTitleChange = (v) => setForm((p) => ({ ...p, title: v, ...(slugManual ? {} : { slug: slugify(v) }) }));

  /* ── Toolbar ── */
  const tb = (pre, suf = "") => insertAtCursor(contentRef.current, setContent, pre, suf);

  function applyHeading(e) {
    const lv = parseInt(e.target.value, 10);
    if (!isNaN(lv)) insertHeading(contentRef.current, setContent, lv);
    headingRef.current.value = "";
  }
  function applyFontSize(e) {
    if (e.target.value) insertSpan(contentRef.current, setContent, `font-size:${e.target.value}px`);
    fontSizeRef.current.value = "";
  }
  function applyCustomSize(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const sz = Number(e.target.value.trim());
    if (!sz || sz < 6 || sz > 300) return;
    insertSpan(contentRef.current, setContent, `font-size:${sz}px`);
    e.target.value = "";
  }
  function applyColor(color) {
    insertSpan(contentRef.current, setContent, `color:${color}`);
    setShowColors(false);
  }

  function openLinkModal() {
    const el = contentRef.current;
    if (!el) return;
    setLinkModal({ text: el.value.slice(el.selectionStart, el.selectionEnd), url: "", selStart: el.selectionStart, selEnd: el.selectionEnd });
  }
  function insertLink() {
    if (!linkModal) return;
    const el = contentRef.current;
    const md = `[${linkModal.text.trim() || "link text"}](${linkModal.url.trim() || "https://"})`;
    if (el) {
      const v = el.value;
      setContent(v.slice(0, linkModal.selStart) + md + v.slice(linkModal.selEnd));
      const pos = linkModal.selStart + md.length;
      setTimeout(() => { el.focus(); el.setSelectionRange(pos, pos); }, 0);
    }
    setLinkModal(null);
  }

  function handleInsertImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE) return toast.error("Image too large. The limit is 6 MB.");
    setUploadingImg(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { data } = await axios.post("/api/admin/blogs/upload-image", { base64: ev.target.result, name: file.name }, { withCredentials: true });
        if (!data?.url) throw new Error("Upload failed.");
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "");
        tb(`\n![${alt}](${data.url})\n`);
        toast.success("Image uploaded and inserted");
        setContentMode((m) => (m === "write" ? "split" : m));
      } catch (err) {
        toast.error(errMsg(err, "Image upload failed. Please try again."));
      }
      setUploadingImg(false);
    };
    reader.readAsDataURL(file);
  }

  /* ── Schemas ── */
  const addSchema = () => setForm((p) => ({ ...p, schemas: [...p.schemas, { ...BLANK_SCHEMA }] }));
  const removeSchema = (i) => setForm((p) => ({ ...p, schemas: p.schemas.filter((_, idx) => idx !== i) }));
  const updateSchema = (i, k, v) => setForm((p) => ({ ...p, schemas: p.schemas.map((sc, idx) => (idx === i ? { ...sc, [k]: v } : sc)) }));
  const generateSchemaAt = (i) => updateSchema(i, "content", JSON.stringify(buildSchemaJson(form.schemas[i].type, form), null, 2));
  async function copySchemaAt(i) {
    try {
      await navigator.clipboard.writeText(form.schemas[i]?.content || "");
      toast.success("Schema copied");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  /* ── FAQs ── */
  const addFaq = () => setForm((p) => ({ ...p, faqs: [...p.faqs, { question: "", answer: "" }] }));
  const removeFaq = (i) => setForm((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }));
  const updateFaq = (i, k, v) => setForm((p) => ({ ...p, faqs: p.faqs.map((q, idx) => (idx === i ? { ...q, [k]: v } : q)) }));

  /* ── AI writer ── */
  async function generateBlogContent() {
    if (!aiTopic.trim() || aiGenerating) return;
    if (form.content.trim() && !confirm("This replaces the current content. Continue?")) return;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiGenerating(true);
    setContentMode("split");
    let acc = "";
    const SEP = "METAJSON_START";
    try {
      const r = await fetch("/api/admin/blogs/generate", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, fillMeta: aiFillMeta }),
      });
      if (!r.ok || !r.body) {
        let message = `Generation failed (${r.status}).`;
        try { const j = await r.json(); if (j?.message) message = j.message; } catch {}
        throw new Error(message);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const sepIdx = acc.indexOf(SEP);
        const shown = sepIdx >= 0 ? acc.slice(0, sepIdx).trimEnd() : acc;
        setForm((p) => ({ ...p, content: shown }));
      }

      const sepIdx = acc.indexOf(SEP);
      const body = sepIdx >= 0 ? acc.slice(0, sepIdx).trimEnd() : acc;
      let meta = {};
      if (aiFillMeta && sepIdx >= 0) {
        try {
          const raw = acc.slice(sepIdx + SEP.length).trim();
          const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
          meta = JSON.parse(jsonText) || {};
        } catch {
          toast.error("Content is ready, but the SEO details could not be read. Fill them in manually.");
        }
      }
      const h1 = body.match(/^#\s+(.+)/m)?.[1]?.trim();

      setForm((p) => {
        const next = { ...p, content: body };
        const str = (v) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : "");
        if (meta.metaTitle) next.metaTitle = str(meta.metaTitle);
        if (meta.metaDescription) next.metaDescription = str(meta.metaDescription).slice(0, 160);
        if (meta.summary) next.summary = str(meta.summary).slice(0, 200);
        if (meta.tags) next.tags = str(meta.tags);
        if (meta.categories) next.categories = str(meta.categories);
        if (h1 && !p.title.trim()) {
          next.title = h1.slice(0, 100);
          if (!slugManual) next.slug = slugify(h1);
        }
        return next;
      });
      toast.success("Content generated. Review it before publishing.");
    } catch (err) {
      if (err?.name === "AbortError") toast("AI writing stopped");
      else toast.error(err.message || "AI generation failed.");
    } finally {
      aiAbortRef.current = null;
      setAiGenerating(false);
    }
  }

  /* ── Save ── */
  async function saveBlog(status) {
    if (!form.title.trim()) return toast.error("Add a title before saving.");
    if (!form.slug.trim()) return toast.error("Add a slug (URL) before saving.");
    if (aiGenerating) return toast.error("Wait for the AI writer to finish.");
    const nextStatus = status || form.status;
    setSaving(true);
    const payload = {
      ...form,
      status: nextStatus,
      categories: form.categories.split(",").map((c) => c.trim()).filter(Boolean),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      faqs: form.faqs.filter((q) => q.question.trim()),
      schemas: form.schemas.filter((sc) => sc.content.trim()),
    };
    try {
      const { data } = editId
        ? await axios.put(`/api/admin/blogs/${editId}`, payload, { withCredentials: true })
        : await axios.post("/api/admin/blogs", payload, { withCredentials: true });
      const saved = data?.blog;
      if (saved) {
        // Uploaded images come back as file URLs; keep them so the next save does not re-upload
        setForm((p) => ({
          ...p,
          status: saved.status || nextStatus,
          slug: saved.slug || p.slug,
          coverImage: { src: saved.coverImage?.src || null, alt: saved.coverImage?.alt || "" },
          cardImage: { src: saved.cardImage?.src || null, alt: saved.cardImage?.alt || "" },
        }));
        if (!editId && saved.id) router.replace(`/dashboard/admin/blogs/create?id=${saved.id}`, undefined, { shallow: true });
      }
      toast.success(nextStatus === "published" ? "Blog published" : nextStatus === "scheduled" ? "Blog scheduled" : "Draft saved");
    } catch (err) {
      toast.error(errMsg(err, "Could not save the blog."));
    }
    setSaving(false);
  }

  const wordCount = countWords(form.content);
  const previewHtml = mdToHtml(form.content);
  const emptyPreview = "<p style='color:#9ca3af;font-style:italic'>Nothing to preview yet…</p>";

  return (
    <div className="d-flex bg-light min-vh-100">
      <Head>
        <title>{`${editId ? "Edit Blog" : "New Blog"} | Admin`}</title>
      </Head>
      <style>{`
        @keyframes opsSpin { to { transform: rotate(360deg); } }
        .ops-blog-layout { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 24px; padding: 24px 24px 32px; align-items: start; }
        .ops-blog-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ops-blog-preview img { max-width: 100%; height: auto; border-radius: 8px; }
        .ops-blog-preview h1, .ops-blog-preview h2, .ops-blog-preview h3 { margin: 1em 0 .5em; line-height: 1.3; }
        .ops-blog-preview blockquote { border-left: 3px solid ${RED}; margin: 12px 0; padding: 4px 14px; color: #555; background: #fafafa; }
        .ops-blog-preview a { color: ${RED}; }
        @media (max-width: 1100px) { .ops-blog-layout { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .ops-blog-split { grid-template-columns: 1fr; } .ops-blog-layout { padding: 16px; } }
      `}</style>
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <button type="button" style={s.backBtn} onClick={() => router.push("/dashboard/admin/blogs")} aria-label="Back to blogs">
            <MdArrowBack size={18} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 18, whiteSpace: "nowrap" }}>{editId ? "Edit Blog" : "New Blog Post"}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={() => saveBlog("draft")} disabled={saving || loadingBlog} style={s.draftBtn}>
              <MdSave size={14} /> {saving ? "Saving…" : "Save draft"}
            </button>
            <button type="button" onClick={() => saveBlog("published")} disabled={saving || loadingBlog} style={s.publishBtn}>
              {saving ? "Saving…" : "Publish"}
            </button>
          </div>
        </nav>

        {loadingBlog ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 60 }}>Loading blog…</p>
        ) : (
          <>
            <div className="ops-blog-layout">
              {/* ══ Left column ══ */}
              <div style={s.col}>
                <div style={s.card}>
                  <h2 style={s.cardTitle}>Article details</h2>
                  <label style={s.label} htmlFor="blog-title">Title <span style={s.req}>*</span></label>
                  <input id="blog-title" style={s.input} placeholder="Enter article title…" value={form.title} maxLength={100} onChange={(e) => handleTitleChange(e.target.value)} />
                  <p style={s.charCount}>{form.title.length}/100</p>
                  <label style={s.label} htmlFor="blog-slug">Slug (URL) <span style={s.req}>*</span></label>
                  <input id="blog-slug" style={s.input} placeholder="my-article-slug" value={form.slug} onChange={(e) => { setSlugManual(true); f("slug", slugify(e.target.value)); }} />
                  <p style={s.hint}>Lowercase letters, numbers and hyphens. Live at /blogs/{form.slug || "your-slug"}</p>
                  <label style={{ ...s.label, marginTop: 14 }}>Cover image</label>
                  <ImgUpload id="blog-cover" value={form.coverImage?.src} onChange={(v) => setImg("coverImage", "src", v)} hint="Shown at the top of the post (1600×700px works well)" />
                  <input id="blog-cover-alt" style={{ ...s.input, marginTop: 8 }} placeholder="Alt text for the cover image (SEO)" value={form.coverImage?.alt || ""} onChange={(e) => setImg("coverImage", "alt", e.target.value)} />
                </div>

                {/* ── Content editor ── */}
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h2 style={{ ...s.cardTitle, margin: 0 }}>Content</h2>
                      <button
                        type="button"
                        onClick={() => setAiPanelOpen((p) => !p)}
                        style={{ ...s.aiToggle, ...(aiPanelOpen ? s.aiToggleOn : {}) }}
                      >
                        <MdAutoAwesome size={14} /> Write with AI
                      </button>
                    </div>
                    <div style={s.modeTabs}>
                      {[["write", MdEdit, "Write"], ["split", MdViewColumn, "Split"], ["preview", MdVisibility, "Preview"]].map(([m, Icon, label]) => (
                        <button type="button" key={m} style={{ ...s.modeTab, ...(contentMode === m ? s.modeTabActive : {}) }} onClick={() => setContentMode(m)}>
                          <Icon size={13} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {aiPanelOpen && (
                    <div style={s.aiPanel}>
                      <p style={s.aiEyebrow}><MdAutoAwesome size={13} /> AI blog writer</p>
                      <textarea
                        id="blog-ai-topic"
                        rows={3}
                        style={{ ...s.input, background: "#fff", resize: "vertical", lineHeight: 1.6 }}
                        placeholder={'Describe the blog you want…\ne.g. "10 corporate Diwali gift ideas under ₹1000 for employees"\ne.g. "How to choose the right printing method for custom T-shirts"'}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generateBlogContent(); }}
                        disabled={aiGenerating}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                          <input id="blog-ai-meta" type="checkbox" checked={aiFillMeta} onChange={(e) => setAiFillMeta(e.target.checked)} style={{ accentColor: RED, width: 14, height: 14 }} />
                          Also fill summary, SEO, categories and tags
                        </label>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>Ctrl+Enter to generate</span>
                        {aiGenerating ? (
                          <button type="button" onClick={() => aiAbortRef.current?.abort()} style={{ ...s.aiBtn, background: "#1a1a2e" }}>
                            <span style={s.spinner} /> Writing… Stop
                          </button>
                        ) : (
                          <button type="button" onClick={generateBlogContent} disabled={!aiTopic.trim()} style={{ ...s.aiBtn, ...(aiTopic.trim() ? {} : s.aiBtnOff) }}>
                            <MdAutoAwesome size={15} /> Generate blog
                          </button>
                        )}
                      </div>
                      {aiGenerating && <p style={{ fontSize: 11.5, color: "#6b7280", margin: "8px 0 0" }}>The blog appears in the editor below as it is written.</p>}
                    </div>
                  )}

                  {contentMode !== "preview" && (
                    <div style={s.toolbar}>
                      <select id="blog-heading" ref={headingRef} style={{ ...s.tbSelect, width: 92 }} defaultValue="" onChange={applyHeading} title="Heading">
                        <option value="" disabled>Heading</option>
                        <option value="0">Paragraph</option>
                        <option value="1">H1</option><option value="2">H2</option>
                        <option value="3">H3</option><option value="4">H4</option>
                        <option value="5">H5</option><option value="6">H6</option>
                      </select>
                      <span style={s.tbDiv} />
                      <button type="button" style={s.toolBtn} title="Bold" onClick={() => tb("**", "**")}><MdFormatBold size={17} /></button>
                      <button type="button" style={s.toolBtn} title="Italic" onClick={() => tb("*", "*")}><MdFormatItalic size={17} /></button>
                      <button type="button" style={s.toolBtn} title="Inline code" onClick={() => tb("`", "`")}><MdCode size={17} /></button>
                      <span style={s.tbDiv} />
                      <select id="blog-font-size" ref={fontSizeRef} style={{ ...s.tbSelect, width: 70 }} defaultValue="" onChange={applyFontSize} title="Font size">
                        <option value="" disabled>Size</option>
                        {FONT_SIZES.map((sz) => <option key={sz} value={sz}>{sz}px</option>)}
                      </select>
                      <input id="blog-font-custom" type="number" min={6} max={300} placeholder="px" title="Custom size, then press Enter" style={s.customSzInput} onKeyDown={applyCustomSize} />
                      <span style={{ position: "relative", display: "inline-flex" }}>
                        <button type="button" style={s.toolBtn} title="Text colour" onClick={(e) => { e.stopPropagation(); setShowColors((p) => !p); }}>
                          <MdFormatColorText size={17} />
                        </button>
                        {showColors && (
                          <div style={s.colorPalette} onClick={(e) => e.stopPropagation()}>
                            {PRESET_COLORS.map((c) => (
                              <button type="button" key={c} title={c} aria-label={`Colour ${c}`} style={{ ...s.colorSwatch, background: c, border: c === "#ffffff" ? "1.5px solid #d1d5db" : "1.5px solid transparent" }} onClick={() => applyColor(c)} />
                            ))}
                          </div>
                        )}
                      </span>
                      <span style={s.tbDiv} />
                      <button type="button" style={s.toolBtn} title="Bullet list" onClick={() => tb("\n- ")}><MdFormatListBulleted size={17} /></button>
                      <button type="button" style={s.toolBtn} title="Numbered list" onClick={() => tb("\n1. ")}><MdFormatListNumbered size={17} /></button>
                      <button type="button" style={s.toolBtn} title="Insert link" onClick={openLinkModal}><MdLink size={17} /></button>
                      <button type="button" style={s.toolBtn} title="Quote" onClick={() => tb("\n> ")}><MdFormatQuote size={17} /></button>
                      <span style={s.tbDiv} />
                      <button type="button" style={{ ...s.toolBtn, gap: 4, opacity: uploadingImg ? 0.5 : 1 }} title="Insert image" disabled={uploadingImg} onClick={() => imgInsertRef.current?.click()}>
                        <MdAddPhotoAlternate size={17} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{uploadingImg ? "Uploading…" : "Image"}</span>
                      </button>
                      <input id="blog-insert-image" ref={imgInsertRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleInsertImage} onClick={(e) => { e.target.value = ""; }} />
                    </div>
                  )}

                  {linkModal !== null && (
                    <div style={s.linkBar}>
                      <MdLink size={16} style={{ color: RED, flexShrink: 0 }} />
                      <input id="blog-link-text" style={{ ...s.input, flex: 1, minWidth: 110, padding: "6px 10px", fontSize: 13, background: "#fff" }} placeholder="Link text" value={linkModal.text} onChange={(e) => setLinkModal((p) => ({ ...p, text: e.target.value }))} />
                      <input
                        id="blog-link-url"
                        autoFocus
                        style={{ ...s.input, flex: 2, minWidth: 180, padding: "6px 10px", fontSize: 13, background: "#fff" }}
                        placeholder="https://… or /products/…"
                        value={linkModal.url}
                        onChange={(e) => setLinkModal((p) => ({ ...p, url: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }}
                      />
                      <button type="button" style={{ ...s.iconBtn, background: RED, color: "#fff", border: "none" }} onClick={insertLink}>Insert</button>
                      <button type="button" style={s.iconBtn} onClick={() => setLinkModal(null)}>Cancel</button>
                    </div>
                  )}

                  {contentMode === "preview" ? (
                    <div className="ops-blog-preview" style={s.previewPane} dangerouslySetInnerHTML={{ __html: previewHtml || emptyPreview }} />
                  ) : contentMode === "split" ? (
                    <div className="ops-blog-split">
                      <textarea id="blog-content" ref={contentRef} style={{ ...s.editor, minHeight: 420 }} placeholder="Write in Markdown…" value={form.content} onChange={(e) => setContent(e.target.value)} />
                      <div className="ops-blog-preview" style={{ ...s.previewPane, minHeight: 420, maxHeight: 720, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: previewHtml || emptyPreview }} />
                    </div>
                  ) : (
                    <textarea
                      id="blog-content"
                      ref={contentRef}
                      style={s.editor}
                      placeholder={"Write in Markdown…\n**bold**  *italic*  ## Heading  - list  [link](url)\nInline HTML works for colour and size."}
                      value={form.content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  )}
                  <p style={{ ...s.hint, textAlign: "right", marginTop: 6 }}>{wordCount.toLocaleString("en-IN")} words</p>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Summary</h2>
                  <textarea id="blog-summary" style={{ ...s.editor, minHeight: 90 }} placeholder="A short summary shown on blog cards and under the title…" value={form.summary} maxLength={200} onChange={(e) => f("summary", e.target.value)} />
                  <p style={s.charCount}>{form.summary.length}/200</p>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>FAQs</h2>
                  <p style={{ ...s.hint, marginBottom: 16 }}>Shown at the end of the post. Pick the FAQPage schema type below to create FAQ structured data.</p>
                  {form.faqs.length === 0 ? (
                    <div style={{ background: "#f9fafb", borderRadius: 8, padding: 22, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                      No FAQs yet. Use <strong>Add FAQ</strong> to add the first question.
                    </div>
                  ) : (
                    form.faqs.map((faq, i) => (
                      <div key={i} style={{ marginTop: i ? 16 : 0, paddingTop: i ? 16 : 0, borderTop: i ? "1.5px solid #f3f4f6" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={s.smallCaps}>Q{i + 1}</span>
                          <button type="button" style={s.removeBtn} onClick={() => removeFaq(i)} title="Remove FAQ" aria-label={`Remove FAQ ${i + 1}`}><MdDeleteOutline size={15} /></button>
                        </div>
                        <input id={`blog-faq-q-${i}`} style={s.input} placeholder="Question, e.g. What is the minimum order quantity?" value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
                        <textarea id={`blog-faq-a-${i}`} style={{ ...s.editor, minHeight: 80, marginTop: 8 }} placeholder="Answer…" value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
                      </div>
                    ))
                  )}
                  <button type="button" style={{ ...s.addBtn, marginTop: 16, width: "100%", justifyContent: "center" }} onClick={addFaq}><MdAdd size={15} /> Add FAQ</button>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Schema (JSON-LD)</h2>
                  <p style={{ ...s.hint, marginBottom: 12 }}>Pick a type and press Generate. It uses the title, slug, cover image, author and FAQs above, so generate again after changing them.</p>
                  {form.schemas.map((sc, i) => (
                    <div key={i} style={{ borderTop: i ? "1.5px solid #f0f2f7" : "none", paddingTop: i ? 16 : 0, marginTop: i ? 16 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ ...s.smallCaps, minWidth: 58 }}>Schema {form.schemas.length > 1 ? i + 1 : ""}</span>
                        <select id={`blog-schema-type-${i}`} style={{ ...s.tbSelect, fontSize: 13, flex: 1, minWidth: 140, padding: "6px 8px" }} value={sc.type} onChange={(e) => updateSchema(i, "type", e.target.value)}>
                          {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button type="button" style={s.iconBtn} onClick={() => generateSchemaAt(i)}><MdCode size={14} /> Generate</button>
                        <button type="button" style={s.iconBtn} onClick={() => copySchemaAt(i)}><MdCopyAll size={14} /> Copy</button>
                        {form.schemas.length > 1 && (
                          <button type="button" style={s.removeBtn} onClick={() => removeSchema(i)} title="Remove schema" aria-label={`Remove schema ${i + 1}`}><MdDeleteOutline size={16} /></button>
                        )}
                      </div>
                      <textarea
                        id={`blog-schema-${i}`}
                        style={{ ...s.editor, minHeight: 160, fontFamily: "monospace", fontSize: 12 }}
                        placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${sc.type}"\n}`}
                        value={sc.content}
                        onChange={(e) => updateSchema(i, "content", e.target.value)}
                      />
                    </div>
                  ))}
                  <button type="button" style={{ ...s.addBtn, marginTop: 16, width: "100%", justifyContent: "center" }} onClick={addSchema}><MdAdd size={15} /> Add schema</button>
                </div>
              </div>

              {/* ══ Right column ══ */}
              <div style={s.col}>
                <div style={s.card}>
                  <h2 style={s.cardTitle}>Blog card image</h2>
                  <ImgUpload id="blog-card" value={form.cardImage?.src} onChange={(v) => setImg("cardImage", "src", v)} hint="Used on listing cards (600×400px). Falls back to the cover image." />
                  <input id="blog-card-alt" style={{ ...s.input, marginTop: 8 }} placeholder="Image alt text" value={form.cardImage?.alt || ""} onChange={(e) => setImg("cardImage", "alt", e.target.value)} />
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Publishing</h2>
                  <label style={s.label}>Status</label>
                  {[["draft", "Draft (hidden)"], ["published", "Published (live)"], ["scheduled", "Scheduled (hidden until published)"]].map(([val, lbl]) => (
                    <label key={val} style={s.radioRow}>
                      <input type="radio" name="blog-status" value={val} checked={form.status === val} onChange={() => f("status", val)} style={{ accentColor: RED }} />
                      <span style={{ fontSize: 14, color: "#374151" }}>{lbl}</span>
                    </label>
                  ))}
                  <label style={{ ...s.label, marginTop: 14 }} htmlFor="blog-date">Publish date</label>
                  <input id="blog-date" type="date" style={{ ...s.input, colorScheme: "light" }} value={form.publishDate} onChange={(e) => f("publishDate", e.target.value)} />
                  <p style={s.hint}>Shown on the post. Leave empty to use the created date.</p>
                  <div style={s.toggleRow}>
                    <span style={{ fontSize: 14, color: "#374151" }}>Allow comments</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.allowComments}
                      aria-label="Allow comments"
                      style={{ ...s.toggle, background: form.allowComments ? RED : "#d1d5db" }}
                      onClick={() => f("allowComments", !form.allowComments)}
                    >
                      <span style={{ ...s.toggleKnob, left: form.allowComments ? 21 : 3 }} />
                    </button>
                  </div>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Robots directives</h2>
                  <label style={s.label} htmlFor="blog-meta-robots">Meta robots tag</label>
                  <input id="blog-meta-robots" style={s.input} value={form.metaRobots} onChange={(e) => f("metaRobots", e.target.value)} />
                  <p style={s.hint}><code style={{ fontSize: 10 }}>{`<meta name="robots" content="${form.metaRobots}">`}</code></p>
                  <label style={{ ...s.label, marginTop: 16 }} htmlFor="blog-x-robots">X-Robots-Tag (HTTP header)</label>
                  <input id="blog-x-robots" style={s.input} value={form.xRobotsTag} onChange={(e) => f("xRobotsTag", e.target.value)} />
                  <p style={s.hint}><code style={{ fontSize: 10 }}>{`X-Robots-Tag: ${form.xRobotsTag}`}</code></p>
                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[["index, follow", DEFAULT_ROBOTS], ["noindex", "noindex, nofollow"], ["noarchive", "index, follow, noarchive"]].map(([lbl, val]) => (
                      <button type="button" key={lbl} style={s.presetBtn} onClick={() => setForm((p) => ({ ...p, metaRobots: val, xRobotsTag: val }))}>{lbl}</button>
                    ))}
                  </div>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Categories &amp; tags</h2>
                  <label style={s.label} htmlFor="blog-cats">Categories</label>
                  <input id="blog-cats" style={s.input} placeholder="Corporate Gifting, Apparel (comma separated)" value={form.categories} onChange={(e) => f("categories", e.target.value)} />
                  <label style={{ ...s.label, marginTop: 12 }} htmlFor="blog-tags">Tags</label>
                  <input id="blog-tags" style={s.input} placeholder="Diwali, Custom T-shirts (comma separated)" value={form.tags} onChange={(e) => f("tags", e.target.value)} />
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>SEO</h2>
                  <label style={s.label} htmlFor="blog-meta-title">Meta title</label>
                  <input id="blog-meta-title" style={s.input} placeholder="Defaults to the title" value={form.metaTitle} onChange={(e) => f("metaTitle", e.target.value)} />
                  <p style={s.charCount}>{form.metaTitle.length}/60</p>
                  <label style={s.label} htmlFor="blog-meta-kw">Meta keywords</label>
                  <input id="blog-meta-kw" style={s.input} placeholder="keyword1, keyword2" value={form.metaKeywords} onChange={(e) => f("metaKeywords", e.target.value)} />
                  <label style={{ ...s.label, marginTop: 12 }} htmlFor="blog-meta-desc">Meta description</label>
                  <textarea id="blog-meta-desc" style={{ ...s.editor, minHeight: 80 }} placeholder="Defaults to the summary" value={form.metaDescription} maxLength={160} onChange={(e) => f("metaDescription", e.target.value)} />
                  <p style={s.charCount}>{form.metaDescription.length}/160</p>
                </div>

                <div style={s.card}>
                  <h2 style={s.cardTitle}>Author</h2>
                  <label style={s.label} htmlFor="blog-author">Author name</label>
                  <input id="blog-author" style={s.input} placeholder="e.g. One Prime Studios Team" value={form.authorName} onChange={(e) => f("authorName", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={s.bottomBar}>
              <button type="button" onClick={() => saveBlog("draft")} disabled={saving} style={s.draftBtnLg}><MdSave size={16} /> {saving ? "Saving…" : "Save draft"}</button>
              <button
                type="button"
                style={s.previewBtnLg}
                disabled={!form.slug || form.status !== "published"}
                title={form.status === "published" ? "Open the live post" : "Publish the post to view it live"}
                onClick={() => window.open(`/blogs/${form.slug}`, "_blank", "noopener")}
              >
                <MdVisibility size={16} /> View live
              </button>
              <button type="button" onClick={() => saveBlog("published")} disabled={saving} style={s.publishBtnLg}>{saving ? "Saving…" : "Publish"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══ Styles ══ */
const s = {
  col: { display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  card: { background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px" },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  smallCaps: { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  req: { color: RED },
  hint: { fontSize: 11.5, color: "#9ca3af", margin: "4px 0 0" },
  charCount: { fontSize: 11, color: "#9ca3af", margin: "4px 0 8px", textAlign: "right" },
  input: { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f9fafb", color: "#111", fontFamily: "inherit" },
  editor: { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: 12, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f9fafb", color: "#111", fontFamily: "inherit", resize: "vertical", minHeight: 360, lineHeight: 1.7 },
  previewPane: { border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "18px 20px", background: "#fff", lineHeight: 1.8, fontSize: 15, color: "#1a1a2e", overflowX: "auto", minHeight: 200 },
  modeTabs: { display: "flex", background: "#f0f2f7", borderRadius: 8, padding: 3, gap: 2 },
  modeTab: { padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: "#6b7280", display: "flex", alignItems: "center", gap: 4 },
  modeTabActive: { background: "#fff", color: "#1a1a2e", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },
  aiToggle: { display: "inline-flex", alignItems: "center", gap: 5, background: "#fff1f0", color: RED, border: "1.5px solid #ffd2cf", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  aiToggleOn: { background: RED, color: "#fff", borderColor: RED },
  aiPanel: { background: "#fff8f7", border: "1.5px solid #ffd2cf", borderRadius: 12, padding: "16px 18px", marginBottom: 14 },
  aiEyebrow: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: RED, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1 },
  aiBtn: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  aiBtnOff: { background: "#f3d0ce", cursor: "not-allowed" },
  spinner: { display: "inline-block", width: 13, height: 13, border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "transparent", borderRadius: "50%", animation: "opsSpin 0.7s linear infinite" },
  toolbar: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, padding: "7px 8px", background: "#f0f2f7", borderRadius: 8, alignItems: "center" },
  tbDiv: { width: 1, height: 22, background: "#d1d5db", margin: "0 3px", display: "inline-block", flexShrink: 0 },
  toolBtn: { background: "none", border: "none", cursor: "pointer", padding: "5px 6px", borderRadius: 5, color: "#374151", display: "inline-flex", alignItems: "center" },
  tbSelect: { border: "1.5px solid #d1d5db", borderRadius: 6, padding: "4px 6px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#374151", cursor: "pointer", outline: "none", flexShrink: 0 },
  customSzInput: { width: 44, border: "1.5px solid #d1d5db", borderRadius: 6, padding: "4px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#374151", outline: "none", textAlign: "center" },
  colorPalette: { position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", borderRadius: 8, padding: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 200, display: "grid", gridTemplateColumns: "repeat(6, 20px)", gap: 4, border: "1px solid #e5e7eb" },
  colorSwatch: { width: 20, height: 20, borderRadius: 4, cursor: "pointer", padding: 0 },
  linkBar: { display: "flex", alignItems: "center", gap: 8, background: "#fff8f7", border: "1.5px solid #ffd2cf", borderRadius: 8, padding: "8px 12px", marginBottom: 8, flexWrap: "wrap" },
  addBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  removeBtn: { display: "inline-flex", alignItems: "center", background: "#fff1f2", color: RED, border: "1px solid #fecdd3", borderRadius: 7, padding: "5px 7px", cursor: "pointer" },
  iconBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  uploadArea: { border: "2px dashed #e5e7eb", borderRadius: 10, minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden", background: "#f9fafb" },
  uploadHas: { border: "2px solid #e5e7eb" },
  uploadPreview: { width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 },
  uploadRemove: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 2 },
  uploadPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, textAlign: "center" },
  radioRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" },
  toggleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  toggle: { width: 42, height: 24, borderRadius: 12, position: "relative", cursor: "pointer", border: "none", padding: 0, transition: "background 0.2s" },
  toggleKnob: { position: "absolute", top: 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  presetBtn: { fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1.5px solid #e5e7eb", background: "#f3f4f6", color: "#374151", cursor: "pointer", fontWeight: 600 },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", padding: "4px 6px" },
  draftBtn: { background: "#f3f4f6", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  publishBtn: { background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  bottomBar: { position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 24px", display: "flex", gap: 12, alignItems: "center", zIndex: 50, flexWrap: "wrap" },
  draftBtnLg: { display: "flex", alignItems: "center", gap: 7, background: "#f3f4f6", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "11px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  previewBtnLg: { display: "flex", alignItems: "center", gap: 7, background: "none", color: RED, border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  publishBtnLg: { marginLeft: "auto", background: RED, color: "#fff", border: "none", borderRadius: 8, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
