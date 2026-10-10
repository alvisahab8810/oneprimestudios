"use client";

// Partner → Rate List: pick a product group, then see its printed rate card.
// Partners only — retail customers and signed-out visitors are turned away by
// the API and shown the notice below.
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";

export default function RateListHome() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await axios.get("/api/rate-list/categories", { withCredentials: true });
        if (active) setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (active) setDenied(err.response?.data?.message || "Could not load the rate list");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rate-list-page">
      <Topbar />
      <Offcanvas />

      <div className="container py-5">
        <h1 className="rate-list-heading">SELECT PRODUCT</h1>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : denied ? (
          <div className="rate-list-notice">
            <p className="mb-3">{denied}</p>
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted py-5">
            No rate cards are published yet. Please check back shortly.
          </p>
        ) : (
          <div className="rate-list-grid">
            {categories.map((cat) => (
              <Link key={cat._id} href={`/rate-list/${cat.slug}`} className="rate-list-card">
                <span className="rate-list-thumb">
                  <img
                    src={cat.image || "/assets/images/products/placeholder.png"}
                    alt={cat.name}
                    loading="lazy"
                  />
                </span>
                <span className="rate-list-card-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />

      <style jsx>{`
        .rate-list-heading {
          text-align: center;
          font-size: 2rem;
          font-weight: 700;
          color: #15417e;
          letter-spacing: 0.04em;
          margin-bottom: 2.5rem;
        }
        .rate-list-notice {
          max-width: 520px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          border: 1px solid #e3e7ef;
          border-radius: 10px;
          background: #f8fafc;
        }
        .rate-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 2rem 1.5rem;
        }
        .rate-list-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-decoration: none;
        }
        .rate-list-thumb {
          display: block;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border-radius: 4px;
          background: #f1f3f7;
        }
        .rate-list-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }
        .rate-list-card:hover .rate-list-thumb img {
          transform: scale(1.04);
        }
        .rate-list-card-name {
          text-align: center;
          font-weight: 600;
          text-transform: uppercase;
          color: #15417e;
        }
        @media (max-width: 480px) {
          .rate-list-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem 1rem;
          }
          .rate-list-heading {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
