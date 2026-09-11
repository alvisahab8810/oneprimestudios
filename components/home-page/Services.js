"use client";

// Homepage "Our Services" grid.
// Categories DB se dynamic aati hain; jitni kam hain utni jagah neeche wale
// FALLBACK_SERVICES se bhar di jaati hai. Jaise-jaise admin nayi category
// add karega, dynamic cards fallback ko replace karte jayenge — koi code
// change nahi chahiye.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const TOTAL_CARDS = 6;

// Category slug → uska description + image (jo DB me image na ho to ye use hoti hai)
const CATEGORY_COPY = {
  "offset-printing": {
    text: "Industrial scale offset printing for bulk orders with unmatched consistency and quality.",
    image: "/assets/images/services/5.webp",
  },
  "digital-printing": {
    text: "Fast, vibrant digital prints perfect for short runs and quick turnarounds.",
    image: "/assets/images/services/4.webp",
  },
  "flex-printing": {
    text: "High-quality flexible printing for banners, signage, and large format applications.",
    image: "/assets/images/services/3.webp",
  },
};

// Jab tak saari categories add nahi hoti, ye placeholder cards dikhte hain
const FALLBACK_SERVICES = [
  {
    title: "Branding & Identity Design",
    text: "Complete brand strategy, logo design, and visual identity systems that make you unforgettable.",
    image: "/assets/images/services/1.webp",
  },
  {
    title: "Print-On-Demand Store",
    text: "Custom merchandise, apparel, and promotional materials delivered with precision and speed.",
    image: "/assets/images/services/2.webp",
  },
  {
    title: "Flex Printing",
    text: "High-quality flexible printing for banners, signage, and large format applications.",
    image: "/assets/images/services/3.webp",
  },
  {
    title: "Digital Printing",
    text: "Fast, vibrant digital prints perfect for short runs and quick turnarounds.",
    image: "/assets/images/services/4.webp",
  },
  {
    title: "Offset Printing",
    text: "Industrial scale offset printing for bulk orders with unmatched consistency and quality.",
    image: "/assets/images/services/5.webp",
  },
  {
    title: "Signage Materials Supply",
    text: "Premium materials for all your signage needs — vinyl, flex, acrylic, and more.",
    image: "/assets/images/services/6.webp",
  },
];

const DEFAULT_TEXT =
  "Explore our complete range under this category — crafted, printed and delivered by One Prime Studios.";

const getUserTypeForLink = () => {
  if (typeof window === "undefined") return "b2c";
  const userType = localStorage.getItem("userType");
  return userType === "partner" || userType === "b2b" ? "b2b" : "b2c";
};

export default function Services() {
  const [cards, setCards] = useState(FALLBACK_SERVICES);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const userType = localStorage.getItem("userType") || "b2c";
        const res = await axios.get(
          `/api/categories?parents=true&userType=${userType}`
        );
        const categories = Array.isArray(res.data) ? res.data : [];

        const dynamicCards = categories.slice(0, TOTAL_CARDS).map((cat, i) => {
          const copy = CATEGORY_COPY[cat.slug] || {};
          return {
            title: cat.name,
            text: copy.text || DEFAULT_TEXT,
            image:
              cat.image ||
              copy.image ||
              FALLBACK_SERVICES[i % FALLBACK_SERVICES.length].image,
            href: {
              pathname: `/category/${cat.slug}`,
              query: { userType: getUserTypeForLink() },
            },
          };
        });

        // Bachi hui jagah fallback se bharo — jo title pehle se aa chuka hai use chhod ke
        const usedTitles = new Set(
          dynamicCards.map((c) => c.title.trim().toLowerCase())
        );
        const filler = FALLBACK_SERVICES.filter(
          (s) => !usedTitles.has(s.title.trim().toLowerCase())
        ).slice(0, Math.max(TOTAL_CARDS - dynamicCards.length, 0));

        setCards([...dynamicCards, ...filler]);
      } catch (err) {
        console.error("Error fetching service categories:", err);
        // Fail hone pe static list hi dikhti rahegi
      }
    };

    fetchCategories();
  }, []);

  return (
    <section className="services-section">
      <div className="container">
        <h2 className="section-heading">
          Our <span>Services</span>
        </h2>
        <p className="section-desc">
          Full-spectrum solutions for brands that refuse to blend in.
        </p>

        <div className="services-grid">
          {cards.map((service) => {
            const card = (
              <>
                <div className="service-img-wrap">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="service-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </div>
                <div className="service-body">
                  <h3 className="service-title">{service.title}</h3>
                  <p className="service-text">{service.text}</p>
                </div>
              </>
            );

            // Dynamic card clickable hai; static placeholder ka koi page nahi
            return service.href ? (
              <Link className="service-card" href={service.href} key={service.title}>
                {card}
              </Link>
            ) : (
              <article className="service-card" key={service.title}>
                {card}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
