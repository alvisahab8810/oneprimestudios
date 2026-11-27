import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  MdArrowBack, MdCalendarToday, MdPerson, MdVisibility,
  MdAccessTime, MdArrowForward, MdExpandMore, MdExpandLess, MdArticle, MdCheck, MdMenu,
} from "react-icons/md";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/models/Blog";
import { mdToHtml, extractToc, readTime } from "@/lib/markdown";

const SITE_NAME = "One Prime Studios";

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function timeAgo(d) {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Stops "</script>" inside admin-written JSON-LD from closing the tag early
const safeJsonLd = (s) => String(s || "").replace(/</g, "\\u003c");

export default function BlogDetail({ blog, related }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeId, setActiveId] = useState("");
  const [commentForm, setCommentForm] = useState({ name: "", email: "", body: "" });
  const [commentSent, setCommentSent] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [comments, setComments] = useState([]);

  const toc = useMemo(() => extractToc(blog?.content || ""), [blog?.content]);
  const html = useMemo(() => mdToHtml(blog?.content), [blog?.content]);
  const faqs = (blog?.faqs || []).filter((f) => f.question);

  useEffect(() => {
    if (!blog?.slug) return;
    fetch(`/api/blogs/comments?slug=${encodeURIComponent(blog.slug)}`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data?.comments) ? data.comments : []))
      .catch(() => {});
  }, [blog?.slug]);

  // Highlights the current section in the table of contents
  useEffect(() => {
    if (!toc.length || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );
    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [toc]);

  if (!blog) return null;

  const date = formatDate(blog.publishDate || blog.createdAt);
  const rt = readTime(blog.content);
  const hasHero = !!blog.coverImage?.src;

  async function handleCommentSubmit(e) {
    e.preventDefault();
    setCommentError("");
    setCommentLoading(true);
    try {
      const r = await fetch("/api/blogs/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: blog.slug, ...commentForm }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || "Could not post your comment.");
      setCommentSent(true);
    } catch (err) {
      setCommentError(err.message || "Could not post your comment.");
    }
    setCommentLoading(false);
  }

  return (
    <>
      <Head>
        <title>{`${blog.metaTitle || blog.title} | ${SITE_NAME}`}</title>
        <meta name="description" content={blog.metaDescription || blog.summary || ""} />
        {blog.metaRobots && <meta name="robots" content={blog.metaRobots} />}
        {blog.metaKeywords && <meta name="keywords" content={blog.metaKeywords} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blog.metaTitle || blog.title} />
        <meta property="og:description" content={blog.metaDescription || blog.summary || ""} />
        {hasHero && <meta property="og:image" content={blog.coverImage.src} />}
        <link rel="stylesheet" href="/assets/css/blogs.css" />
        {blog.schemas?.length > 0
          ? blog.schemas.map((sc, i) =>
              sc.content ? (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(sc.content) }} />
              ) : null
            )
          : blog.schema
          ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(blog.schema) }} />
          : null}
      </Head>

      <Topbar />
      <Offcanvas />

      <div className="blog-detail-page">
        {hasHero ? (
          <div className="bdd-hero">
            <img src={blog.coverImage.src} alt={blog.coverImage.alt || blog.title} />
          </div>
        ) : (
          <div className="bdd-hero-placeholder" />
        )}

        <div className="container">
          <div className="bdd-layout">
            <div className="bdd-main">
              <div className="bdd-post-header">
                <div className="blg-top-row">
                  <Link href="/blogs" className="bl-back-btn">
                    <MdArrowBack size={16} /> Back to Blogs
                  </Link>
                  {blog.categories?.length > 0 && (
                    <div className="bdd-cats">
                      {blog.categories.map((c) => (
                        <span key={c} className="bl-badge bdd-cat-badge">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <h1 className="bdd-title">{blog.title}</h1>

                <div className="bdd-meta-row">
                  {blog.authorName && (
                    <span className="bdd-meta-item"><MdPerson size={15} />{blog.authorName}</span>
                  )}
                  {date && (
                    <span className="bdd-meta-item"><MdCalendarToday size={14} />{date}</span>
                  )}
                  <span className="bdd-meta-item"><MdAccessTime size={14} />{rt}</span>
                  <span className="bdd-meta-item">
                    <MdVisibility size={14} />{(blog.views || 0).toLocaleString("en-IN")} views
                  </span>
                </div>
              </div>

              {blog.summary && <p className="bdd-summary">{blog.summary}</p>}

              <div className="blog-detail-content" dangerouslySetInnerHTML={{ __html: html }} />

              {blog.tags?.length > 0 && (
                <div className="blog-detail-tags">
                  <span style={{ fontSize: 13, color: "#999", marginRight: 6 }}>Tags:</span>
                  {blog.tags.map((t) => (
                    <Link href={`/blogs?tag=${encodeURIComponent(t)}`} key={t} className="blog-detail-tag bdd-tag-link">
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              {comments.length > 0 && (
                <div className="bdd-comments-list">
                  <h3 className="bdd-section-heading">
                    {comments.length} Comment{comments.length !== 1 ? "s" : ""}
                  </h3>
                  {comments.map((c) => (
                    <div key={c._id} className="bdd-comment-item">
                      <div className="bdd-comment-avatar">{(c.name || "?")[0].toUpperCase()}</div>
                      <div className="bdd-comment-content">
                        <div className="bdd-comment-meta">
                          <span className="bdd-comment-author">{c.name}</span>
                          <span className="bdd-comment-time">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="bdd-comment-body">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {blog.allowComments !== false && (
                <div className="bdd-comments">
                  <h3 className="bdd-section-heading">Leave a Comment</h3>
                  {commentSent ? (
                    <div className="bdd-success-msg">
                      <span className="bdd-success-icon"><MdCheck /></span>
                      Thank you! Your comment is under review and will appear once approved.
                    </div>
                  ) : (
                    <form className="bdd-comment-form" onSubmit={handleCommentSubmit}>
                      <div className="bdd-form-row">
                        <div className="bdd-field">
                          <label htmlFor="cmt-name">Your Name *</label>
                          <input id="cmt-name" type="text" placeholder="Your name" required maxLength={80}
                            value={commentForm.name}
                            onChange={(e) => setCommentForm((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="bdd-field">
                          <label htmlFor="cmt-email">Your Email *</label>
                          <input id="cmt-email" type="email" placeholder="you@email.com" required maxLength={120}
                            value={commentForm.email}
                            onChange={(e) => setCommentForm((p) => ({ ...p, email: e.target.value }))} />
                        </div>
                      </div>
                      <div className="bdd-field">
                        <label htmlFor="cmt-body">Comment *</label>
                        <textarea id="cmt-body" placeholder="Share your thoughts…" rows={4} required maxLength={3000}
                          value={commentForm.body}
                          onChange={(e) => setCommentForm((p) => ({ ...p, body: e.target.value }))} />
                      </div>
                      {commentError && <p style={{ color: "#E10600", fontSize: 13, margin: "0 0 10px" }}>{commentError}</p>}
                      <button type="submit" className="bdd-submit-btn" disabled={commentLoading}>
                        {commentLoading ? "Posting…" : "Post Comment"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <aside className="bdd-sidebar">
              {toc.length > 0 && (
                <div className="bdd-toc-card">
                  <h4 className="bdd-toc-heading">
                    <span className="bdd-toc-icon"><MdMenu /></span> Table of Contents
                  </h4>
                  <ul className="bdd-toc-list">
                    {toc.map((item, idx) => (
                      <li key={idx} className={`bdd-toc-item bdd-toc-l${item.level}${activeId === item.id ? " active" : ""}`}>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>

        {faqs.length > 0 && (
          <div className="blog-faqs">
            <div className="container">
              <h2 className="blog-faqs-title">Frequently Asked Questions</h2>
              <div className="bdd-accordion">
                {faqs.map((faq, i) => (
                  <div key={i} className={`bdd-faq-item${openFaq === i ? " open" : ""}`}>
                    <button type="button" className="bdd-faq-trigger" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      <span className="bdd-faq-num">Q{i + 1}</span>
                      <span className="bdd-faq-q">{faq.question}</span>
                      <span className="bdd-faq-chevron">
                        {openFaq === i ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
                      </span>
                    </button>
                    <div className="bdd-faq-body">
                      <div className="bdd-faq-answer"><p>{faq.answer}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {related?.length > 0 && (
          <div className="bdd-related">
            <div className="container">
              <h2 className="blog-related-title">You might also like</h2>
              <div className="bdd-carousel">
                {related.map((b) => {
                  const img = b.cardImage?.src || b.coverImage?.src;
                  const badge = b.categories?.[0];
                  return (
                    <Link href={`/blogs/${b.slug}`} key={b._id} className="bdd-carousel-link">
                      <div className="bl-card bdd-carousel-card">
                        <div className="bl-card-img">
                          {img ? (
                            <img src={img} alt={b.cardImage?.alt || b.title} />
                          ) : (
                            <div className="bl-card-img-placeholder"><MdArticle size={36} /></div>
                          )}
                          {badge && <span className="bl-badge">{badge}</span>}
                        </div>
                        <div className="bl-card-body">
                          <h3 className="bl-card-title">{b.title}</h3>
                          {b.summary && <p className="bl-card-summary">{b.summary}</p>}
                          <div className="bl-card-footer">
                            <div className="bl-card-meta">
                              {b.authorName && <span className="bl-card-author">{b.authorName}</span>}
                            </div>
                            <span className="bl-read-more">Read more <MdArrowForward size={14} /></span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  try {
    await dbConnect();
    const blog = await Blog.findOneAndUpdate(
      { slug: String(params.slug || "").toLowerCase(), status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!blog) return { notFound: true };
    if (blog.xRobotsTag) res.setHeader("X-Robots-Tag", blog.xRobotsTag);

    const or = [];
    if (blog.categories?.length) or.push({ categories: { $in: blog.categories } });
    if (blog.tags?.length) or.push({ tags: { $in: blog.tags } });

    let related = or.length
      ? await Blog.find({ status: "published", _id: { $ne: blog._id }, $or: or })
          .select("title slug summary cardImage coverImage categories authorName")
          .sort({ createdAt: -1 })
          .limit(6)
          .lean()
      : [];
    // Fall back to the latest posts so the section is not empty
    if (!related.length) {
      related = await Blog.find({ status: "published", _id: { $ne: blog._id } })
        .select("title slug summary cardImage coverImage categories authorName")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
    }

    return {
      props: {
        blog: JSON.parse(JSON.stringify({ ...blog, id: String(blog._id) })),
        related: JSON.parse(JSON.stringify(related)),
      },
    };
  } catch (err) {
    console.error("Blog page error:", err?.message);
    return { notFound: true };
  }
}
