import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { MdSearch, MdArrowForward, MdChevronLeft, MdChevronRight, MdArticle } from "react-icons/md";

const LIMIT = 9;

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BlogList() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q, c, t, p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (q) params.set("search", q);
      if (c) params.set("category", c);
      if (t) params.set("tag", t);
      const r = await fetch(`/api/blogs?${params}`);
      const data = await r.json();
      setBlogs(data.blogs || []);
      setPages(data.pages || 1);
      if (Array.isArray(data.categories)) setCats(data.categories.slice(0, 12));
    } catch {
      setBlogs([]);
    }
    setLoading(false);
  }, []);

  // Read ?tag= from the URL on first load
  useEffect(() => {
    if (!router.isReady) return;
    const urlTag = typeof router.query.tag === "string" ? router.query.tag : "";
    setTag(urlTag);
    setPage(1);
    load("", "", urlTag, 1);
  }, [router.isReady, router.query.tag, load]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
    load(search, cat, tag, 1);
  }

  function handleCat(c) {
    const next = c === cat ? "" : c;
    setCat(next);
    setTag("");
    setPage(1);
    load(query, next, "", 1);
  }

  function handlePage(p) {
    setPage(p);
    load(query, cat, tag, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearTag() {
    setTag("");
    load(query, cat, "", 1);
    router.push("/blogs", undefined, { shallow: true });
  }

  return (
    <section className="blogs-list-section">
      <div className="container">
        <div className="bl-section-header">
          <h2 className="bl-section-title">Ideas, Guides &amp; Stories on Branding</h2>
          {tag ? (
            <p className="bl-section-sub">
              Showing posts tagged <span className="bl-brand">#{tag}</span>&nbsp;&nbsp;
              <button type="button" className="bl-clear-btn" onClick={clearTag}>
                Clear filter
              </button>
            </p>
          ) : (
            <p className="bl-section-sub">
              Tips on custom merchandise, gifting and print from <span className="bl-brand">One Prime Studios</span>
            </p>
          )}
        </div>

        <form className="bl-hero-search" onSubmit={handleSearch}>
          <div className="bl-hero-search-inner">
            <MdSearch className="bl-hero-search-icon" />
            <input
              id="blog-search"
              type="text"
              placeholder="Search articles, products, tips…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit">Search</button>
        </form>

        {cats.length > 0 && (
          <div className="bl-cat-pills">
            <button type="button" className={`bl-cat-pill ${!cat ? "active" : ""}`} onClick={() => handleCat("")}>
              All
            </button>
            {cats.map((c) => (
              <button
                type="button"
                key={c}
                className={`bl-cat-pill ${cat === c ? "active" : ""}`}
                onClick={() => handleCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="bl-grid">
          {loading ? (
            <div className="bl-loading">Loading articles…</div>
          ) : blogs.length === 0 ? (
            <div className="bl-empty">
              <MdArticle size={44} style={{ marginBottom: 12, color: "#E10600" }} />
              <p style={{ margin: 0 }}>
                {query || cat || tag ? "No articles match your search." : "No articles published yet. Check back soon!"}
              </p>
            </div>
          ) : (
            blogs.map((blog) => {
              const img = blog.cardImage?.src || blog.coverImage?.src;
              const badge = blog.categories?.[0];
              const date = formatDate(blog.publishDate || blog.createdAt);

              return (
                <Link href={`/blogs/${blog.slug}`} key={blog.id} style={{ textDecoration: "none", display: "block" }}>
                  <div className="bl-card">
                    <div className="bl-card-img">
                      {img ? (
                        <img src={img} alt={blog.cardImage?.alt || blog.title} />
                      ) : (
                        <div className="bl-card-img-placeholder">
                          <MdArticle size={40} />
                        </div>
                      )}
                      {badge && <span className="bl-badge">{badge}</span>}
                    </div>
                    <div className="bl-card-body">
                      <h3 className="bl-card-title">{blog.title}</h3>
                      {blog.summary && <p className="bl-card-summary">{blog.summary}</p>}
                      <div className="bl-card-footer">
                        <div className="bl-card-meta">
                          {blog.authorName && <span className="bl-card-author">{blog.authorName}</span>}
                          <span className="bl-card-date">{date}</span>
                        </div>
                        <span className="bl-read-more">
                          Read more <MdArrowForward size={15} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {pages > 1 && (
          <div className="bl-pagination">
            <button className="bl-pag-btn" onClick={() => handlePage(page - 1)} disabled={page === 1} aria-label="Previous page">
              <MdChevronLeft size={18} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`bl-pag-btn ${page === n ? "active" : ""}`} onClick={() => handlePage(n)}>
                {n}
              </button>
            ))}
            <button className="bl-pag-btn" onClick={() => handlePage(page + 1)} disabled={page >= pages} aria-label="Next page">
              <MdChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
