// pages/flash-sale/[slug].js — every product in one flash sale, with the timer.
// When the timer runs out the products are taken off the page and a
// "deal has ended" message is shown instead.
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";
import DealCountdown from "@/components/flash-sale/DealCountdown";
import { FlashStyles } from "@/components/flash-sale/FlashSaleSection";
import DealProductCard, { useWishlistIds } from "@/components/flash-sale/DealProductCard";

const fmtWhen = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });

export default function FlashSalePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [sale, setSale] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing | error
  const [offsetMs, setOffsetMs] = useState(0);
  const wishlist = useWishlistIds();

  const load = () => {
    if (!slug) return;
    let userType = "";
    try {
      userType = localStorage.getItem("userType") || "";
    } catch {}
    const startedAt = Date.now();
    axios
      .get(`/api/flash-sales/${encodeURIComponent(slug)}`, { params: userType ? { userType } : {} })
      .then(({ data }) => {
        const roundTrip = Date.now() - startedAt;
        if (data?.serverNow) setOffsetMs(new Date(data.serverNow).getTime() + roundTrip / 2 - Date.now());
        setSale(data.data);
        setState("ready");
      })
      .catch((err) => setState(err?.response?.status === 404 ? "missing" : "error"));
  };

  useEffect(load, [slug]);

  const endNow = () => setSale((s) => (s ? { ...s, status: "ended", products: [] } : s));
  const live = sale?.status === "live";

  return (
    <>
      <Head>
        <title>{sale ? `${sale.title} | One Prime Studios` : "Flash sale | One Prime Studios"}</title>
        <meta name="description" content={sale?.subtitle || "Limited-time deals from One Prime Studios"} />
      </Head>
      <Topbar />
      <Offcanvas />

      <div className="container py-4 mb-5">
        {state === "loading" && <p className="text-muted py-5 text-center">Loading the deal...</p>}
        {state === "error" && (
          <div className="alert alert-warning">
            The deal could not be loaded. <button type="button" className="btn btn-link p-0" onClick={load}>Try again</button>
          </div>
        )}
        {state === "missing" && (
          <div className="fs-ended">
            <h1>This deal is not available</h1>
            <p>It may have been removed. Have a look at our other products.</p>
            <Link href="/products" className="btn btn-danger">Browse products</Link>
          </div>
        )}

        {state === "ready" && sale && (
          <>
            <div className="fs-head fs-page-head">
              <div>
                <h1 className="section-heading">
                  <span>Flash</span> Sale
                </h1>
                <p className="section-desc">{sale.title}</p>
                {sale.subtitle && <p className="fs-sub">{sale.subtitle}</p>}
              </div>
              {live && (
                <div className="fs-side">
                  <DealCountdown endsAt={sale.endsAt} offsetMs={offsetMs} onEnd={endNow} size="lg" />
                </div>
              )}
            </div>

            {live && (
              <>
                <p className="text-muted mb-3">
                  <strong>{sale.products.length}</strong> product{sale.products.length === 1 ? "" : "s"} in this deal. Prices go back to normal when the timer ends.
                </p>
                {sale.products.length ? (
                  <div className="pod-grid">
                    {sale.products.map((p) => (
                      <DealProductCard key={p._id} p={p} inWishlist={wishlist.ids.includes(p._id)} onToggleWishlist={wishlist.toggle} />
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-info">Products for this deal are being added. Check back soon.</div>
                )}
              </>
            )}

            {sale.status === "scheduled" && (
              <div className="fs-ended">
                <h2>This deal starts on {fmtWhen(sale.startsAt)}</h2>
                <p>Come back then to grab the deal prices.</p>
                <Link href="/products" className="btn btn-outline-danger">Browse products</Link>
              </div>
            )}

            {sale.status === "ended" && (
              <div className="fs-ended">
                <h2>This deal has ended</h2>
                <p>Missed it? Keep an eye on the home page for the next flash sale.</p>
                <Link href="/products" className="btn btn-danger">Browse products</Link>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
      <FlashStyles />

      <style jsx global>{`
        .fs-page-head { margin-top: 8px; }
        .fs-sub { margin: 8px 0 0; color: #555; font-size: 16px; }
        .fs-ended { text-align: center; padding: 48px 16px; background: #fafafa; border-radius: 16px; margin: 16px 0 32px; }
        .fs-ended h1, .fs-ended h2 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
        .fs-ended p { color: #666; margin-bottom: 18px; }
      `}</style>
    </>
  );
}
