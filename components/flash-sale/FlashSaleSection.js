// components/flash-sale/FlashSaleSection.js
// Home page section for running flash sales. It uses the same heading and the
// same product cards as "Print On Demand", in a carousel that moves by itself.
// It renders nothing for partners or when no deal is live, and takes itself
// off the page the moment a timer runs out.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import DealCountdown from "@/components/flash-sale/DealCountdown";
import DealProductCard, { DealCardStyles, useWishlistIds } from "@/components/flash-sale/DealProductCard";

const AUTO_MS = 3500;

// Styles shared by the home section, the deal page and the deal category page
export function FlashStyles() {
  return (
    <>
      <DealCardStyles />
      <style jsx global>{`
        .fs-home { margin-top: 70px; }
        .fs-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: 32px; }
        .fs-head .section-heading { margin-bottom: 10px; }
        .fs-head .section-desc { margin: 0; }
        .fs-side { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; color: #111; }
        .fs-all { font-weight: 700; color: #E10600; text-decoration: none; white-space: nowrap; }
        .fs-all:hover { text-decoration: underline; }
        .fs-carousel { position: relative; }
        .fs-arrow { position: absolute; top: 38%; z-index: 3; box-shadow: 0 2px 8px rgba(0,0,0,0.15); width: 40px; height: 40px; border-radius: 50%; border: 1px solid #e3e3e3; background: #fff; color: #111; font-size: 18px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        .fs-arrow:hover { background: #E10600; border-color: #E10600; color: #fff; }
        .fs-prev { left: -20px; }
        .fs-next { right: -20px; }
        .fs-arrow:focus-visible { outline: 2px solid #E10600; outline-offset: 2px; }
        .fs-track { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 30px) / 3); gap: 15px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; padding-bottom: 4px; }
        .fs-track::-webkit-scrollbar { display: none; }
        .fs-track > * { scroll-snap-align: start; }
        .fs-dots { display: flex; justify-content: center; gap: 6px; margin-top: 16px; }
        .fs-dot { width: 8px; height: 8px; border-radius: 999px; border: none; padding: 0; background: #d9d9d9; cursor: pointer; transition: width 0.25s ease, background 0.25s ease; }
        .fs-dot[aria-current="true"] { width: 22px; background: #E10600; }
        @media (max-width: 991px) {
          .fs-home { margin-top: 0; }
          .fs-prev { left: 6px; }
          .fs-next { right: 6px; }
          .fs-track { grid-auto-columns: calc((100% - 18px) / 2); gap: 18px; }
        }
        @media (max-width: 575px) {
          .fs-head { align-items: flex-start; margin-bottom: 20px; }
          .fs-track { grid-auto-columns: 82%; gap: 14px; }
          .fs-arrow { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-dot, .fs-arrow { transition: none; }
        }
      `}</style>
    </>
  );
}

function DealCarousel({ products, wishlist }) {
  const trackRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [touchedAt, setTouchedAt] = useState(0);
  const [page, setPage] = useState({ index: 0, count: 1 });

  // How far one card moves, read from the layout so it fits every screen size
  const stepWidth = (el) => {
    const card = el.firstElementChild;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : el.clientWidth;
  };

  const move = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) return;
    if (dir > 0 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: max, behavior: "smooth" });
    else el.scrollBy({ left: dir * stepWidth(el), behavior: "smooth" });
  }, []);

  const goTo = (i) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * stepWidth(el), behavior: "smooth" });
  };

  // Which "page" the track is on, for the dots
  const syncDots = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = stepWidth(el);
    const visible = Math.max(1, Math.round(el.clientWidth / w));
    const count = Math.max(1, products.length - visible + 1);
    const index = Math.min(count - 1, Math.round(el.scrollLeft / w));
    setPage((p) => (p.index === index && p.count === count ? p : { index, count }));
  }, [products.length]);

  useEffect(() => {
    syncDots();
    window.addEventListener("resize", syncDots);
    return () => window.removeEventListener("resize", syncDots);
  }, [syncDots]);

  // Moves on its own; stops while the pointer is over it, for a few seconds
  // after a swipe, while the tab is hidden, and for people who turned motion off
  useEffect(() => {
    if (hovered) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - touchedAt < 6000) return;
      move(1);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [hovered, touchedAt, move]);

  return (
    <div
      className="fs-carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      onTouchStart={() => setTouchedAt(Date.now())}
    >
      {page.count > 1 && (
        <>
          <button type="button" className="fs-arrow fs-prev" aria-label="Previous deals" onClick={() => move(-1)}>‹</button>
          <button type="button" className="fs-arrow fs-next" aria-label="Next deals" onClick={() => move(1)}>›</button>
        </>
      )}
      <div className="fs-track" ref={trackRef} onScroll={syncDots}>
        {products.map((p) => (
          <DealProductCard key={p._id} p={p} inWishlist={wishlist.ids.includes(p._id)} onToggleWishlist={wishlist.toggle} />
        ))}
      </div>
      {page.count > 1 && (
        <div className="fs-dots">
          {Array.from({ length: page.count }).map((_, i) => (
            <button
              key={i}
              type="button"
              className="fs-dot"
              aria-label={`Show deal ${i + 1}`}
              aria-current={i === page.index ? "true" : "false"}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlashSaleSection() {
  const [sales, setSales] = useState([]);
  const [offsetMs, setOffsetMs] = useState(0);
  const wishlist = useWishlistIds();

  useEffect(() => {
    let userType = "";
    try {
      userType = localStorage.getItem("userType") || "";
    } catch {}
    if (userType === "partner" || userType === "b2b") return;

    let alive = true;
    const startedAt = Date.now();
    axios
      .get("/api/flash-sales/live", { params: { home: 1, limit: 12, ...(userType ? { userType } : {}) } })
      .then(({ data }) => {
        if (!alive) return;
        const roundTrip = Date.now() - startedAt;
        if (data?.serverNow) setOffsetMs(new Date(data.serverNow).getTime() + roundTrip / 2 - Date.now());
        setSales(Array.isArray(data?.data) ? data.data.filter((s) => s.products?.length) : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const endSale = (id) => setSales((list) => list.filter((s) => s._id !== id));

  if (!sales.length) return null;

  return (
    <>
      {sales.map((sale) => (
        <section key={sale._id} className="pod-section fs-home" aria-labelledby={`fs-title-${sale._id}`}>
          <div className="container">
            <div className="fs-head">
              <div>
                <h2 className="section-heading" id={`fs-title-${sale._id}`}>
                  <span>Flash</span> Sale
                </h2>
                <p className="section-desc">{sale.subtitle || sale.title}</p>
              </div>
              <div className="fs-side">
                <DealCountdown endsAt={sale.endsAt} offsetMs={offsetMs} onEnd={() => endSale(sale._id)} />
                <Link href={`/flash-sale/${sale.slug}`} className="fs-all">
                  View all {sale.productCount > 1 ? `${sale.productCount} ` : ""}deals →
                </Link>
              </div>
            </div>

            <DealCarousel products={sale.products} wishlist={wishlist} />
          </div>
        </section>
      ))}

      <FlashStyles />
    </>
  );
}
