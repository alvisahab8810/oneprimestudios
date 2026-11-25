// components/header/SearchOverlay.js
// The header search: a magnifier button that opens a search panel. Results
// arrive as the visitor types — products first, matching categories beside
// them. On a phone the panel takes the whole screen.
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const RECENT_KEY = "ops_recent_searches";
const MAX_RECENT = 6;
const MIN_CHARS = 2;

// Recent searches are a convenience only — a private window or blocked
// storage must never break the search itself.
const readRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};
const writeRecent = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // nothing to do
  }
};

// Bold the part of the name that matches what was typed
function Highlight({ text, query }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return text;
  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "ig"
  );
  return String(text)
    .split(pattern)
    .map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function SearchOverlay({ buttonClassName = "top-btn" }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const requestRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState(-1); // keyboard-highlighted product

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setProducts([]);
    setCategories([]);
    setActive(-1);
    setFailed(false);
  }, []);

  const remember = useCallback((text) => {
    const clean = text.trim();
    if (clean.length < MIN_CHARS) return;
    const next = [clean, ...readRecent().filter((r) => r.toLowerCase() !== clean.toLowerCase())];
    writeRecent(next);
  }, []);

  // Opening: focus the box, load recent searches, stop the page behind scrolling
  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Leaving the page through a result closes the panel
  useEffect(() => {
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events, close]);

  // Search as the visitor types, a moment after they pause. A slow answer to
  // an older query is dropped, so results never jump backwards.
  useEffect(() => {
    if (!open) return;
    const text = query.trim();
    if (text.length < MIN_CHARS) {
      setProducts([]);
      setCategories([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    const ticket = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        // Same side of the catalogue the rest of the site shows this visitor.
        // The server still trusts the login cookie over this value.
        let side = "";
        try {
          side = localStorage.getItem("userType") || "";
        } catch {
          side = "";
        }
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(text)}${side ? `&userType=${encodeURIComponent(side)}` : ""}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (ticket !== requestRef.current) return;
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setFailed(false);
        setActive(-1);
      } catch {
        if (ticket !== requestRef.current) return;
        setProducts([]);
        setCategories([]);
        setFailed(true);
      } finally {
        if (ticket === requestRef.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  const goTo = (product) => {
    remember(query);
    router.push(`/products/${product.slug}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") return close();
    if (!products.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % products.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? products.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      goTo(products[active >= 0 ? active : 0]);
    }
  };

  const typed = query.trim().length >= MIN_CHARS;
  const nothingFound = typed && !loading && !failed && !products.length && !categories.length;

  return (
    <>
      <button
        type="button"
        className={`${buttonClassName} ops-search-trigger`}
        onClick={() => setOpen(true)}
        aria-label="Search products"
        title="Search products"
      >
        <SearchIcon />
      </button>

      {open && (
        <div className="ops-search-backdrop" onMouseDown={close} role="dialog" aria-modal="true" aria-label="Search products">
          <div className="ops-search-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ops-search-bar">
              <span className="ops-search-bar-icon"><SearchIcon size={20} /></span>
              <input
                id="ops-header-search"
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search products, categories, SKU..."
                autoComplete="off"
                maxLength={80}
                enterKeyHint="search"
              />
              {query && (
                <button type="button" className="ops-search-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
                  Clear
                </button>
              )}
              <button type="button" className="ops-search-close" onClick={close} aria-label="Close search">
                ✕
              </button>
            </div>

            <div className="ops-search-body">
              {/* Before anything is typed: recent searches */}
              {!typed && (
                recent.length > 0 ? (
                  <div>
                    <div className="ops-search-heading">
                      <span>Recent searches</span>
                      <button type="button" onClick={() => { writeRecent([]); setRecent([]); }}>Clear all</button>
                    </div>
                    <div className="ops-search-chips">
                      {recent.map((r) => (
                        <button type="button" key={r} onClick={() => setQuery(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="ops-search-hint">Type a product name, a category or a SKU. Results appear as you type.</p>
                )
              )}

              {typed && loading && !products.length && <p className="ops-search-hint">Searching...</p>}

              {failed && <p className="ops-search-hint">Search is not available right now. Please try again.</p>}

              {nothingFound && (
                <p className="ops-search-hint">
                  No products found for &ldquo;{query.trim()}&rdquo;. Check the spelling or try a shorter word.
                </p>
              )}

              {categories.length > 0 && (
                <div className="ops-search-section">
                  <div className="ops-search-heading"><span>Categories</span></div>
                  <div className="ops-search-chips">
                    {categories.map((c) => (
                      <Link key={c._id} href={`/category/${c.slug}`} onClick={() => remember(query)}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {products.length > 0 && (
                <div className="ops-search-section">
                  <div className="ops-search-heading">
                    <span>Products ({products.length})</span>
                  </div>
                  <div className="ops-search-results">
                    {products.map((p, i) => (
                      <Link
                        key={p._id}
                        href={`/products/${p.slug}`}
                        className={`ops-search-item ${i === active ? "is-active" : ""}`}
                        onClick={() => remember(query)}
                        onMouseEnter={() => setActive(i)}
                      >
                        <img src={p.image || "/placeholder.png"} alt="" loading="lazy" />
                        <span className="ops-search-item-text">
                          <span className="ops-search-item-name"><Highlight text={p.name} query={query} /></span>
                          {p.category && <span className="ops-search-item-cat">{p.category}</span>}
                          <span className="ops-search-item-meta">
                            {p.price !== null && <span className="ops-search-item-price">₹{Number(p.price).toFixed(2)}</span>}
                            {p.offer && <span className="ops-search-item-offer">{p.offer}</span>}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ops-search-trigger {
          cursor: pointer;
          color: #111111;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
        }
        .ops-search-backdrop {
          position: fixed;
          inset: 0;
          z-index: 5000;
          background: rgba(17, 17, 17, 0.55);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 72px 16px 16px;
        }
        .ops-search-panel {
          width: 100%;
          max-width: 760px;
          max-height: calc(100vh - 110px);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ops-search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid #eee;
        }
        .ops-search-bar-icon {
          color: #E10600;
          display: inline-flex;
        }
        .ops-search-bar input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          font-size: 17px;
          color: #111111;
          background: transparent;
        }
        .ops-search-bar input::-webkit-search-cancel-button {
          display: none;
        }
        .ops-search-clear,
        .ops-search-close {
          border: none;
          background: none;
          cursor: pointer;
          color: #666;
          font-size: 13px;
          padding: 6px 8px;
          border-radius: 8px;
        }
        .ops-search-close {
          font-size: 16px;
          background: #f4f4f4;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
        }
        .ops-search-clear:hover,
        .ops-search-close:hover {
          color: #E10600;
        }
        .ops-search-clear:focus-visible,
        .ops-search-close:focus-visible,
        .ops-search-trigger:focus-visible,
        .ops-search-item:focus-visible {
          outline: 2px solid #E10600;
          outline-offset: 2px;
        }
        .ops-search-body {
          padding: 16px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .ops-search-hint {
          margin: 18px 4px;
          color: #777;
          font-size: 14px;
          text-align: center;
        }
        .ops-search-section + .ops-search-section {
          margin-top: 18px;
        }
        .ops-search-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 10px;
        }
        .ops-search-heading button {
          border: none;
          background: none;
          color: #E10600;
          font-size: 12px;
          cursor: pointer;
          text-transform: none;
          letter-spacing: 0;
        }
        .ops-search-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ops-search-chips a,
        .ops-search-chips button {
          border: 1px solid #e5e5e5;
          background: #fafafa;
          color: #111111;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }
        .ops-search-chips a:hover,
        .ops-search-chips button:hover {
          border-color: #E10600;
          color: #E10600;
        }
        .ops-search-results {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .ops-search-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 12px;
          border: 1px solid transparent;
          text-decoration: none;
          color: #111111;
          min-width: 0;
        }
        .ops-search-item.is-active,
        .ops-search-item:hover {
          background: #fff5f5;
          border-color: #f3c6c4;
          color: #111111;
        }
        .ops-search-item img {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border-radius: 10px;
          background: #f4f4f4;
          flex-shrink: 0;
        }
        .ops-search-item-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 2px;
        }
        .ops-search-item-name {
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ops-search-item-name mark {
          background: none;
          color: #E10600;
          padding: 0;
        }
        .ops-search-item-cat {
          font-size: 12px;
          color: #888;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ops-search-item-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .ops-search-item-price {
          font-size: 13px;
          font-weight: 700;
        }
        .ops-search-item-offer {
          font-size: 11px;
          font-weight: 700;
          color: #1d7044;
          background: #eafaf0;
          border-radius: 999px;
          padding: 1px 8px;
        }
        @media (max-width: 640px) {
          .ops-search-backdrop {
            padding: 0;
          }
          .ops-search-panel {
            max-width: none;
            height: 100%;
            max-height: none;
            border-radius: 0;
          }
          .ops-search-bar input {
            font-size: 16px;
          }
          .ops-search-results {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
