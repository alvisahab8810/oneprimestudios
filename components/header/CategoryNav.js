"use client";

// Header ke neeche dynamic category bar.
// Parent categories = menu items, unke sub-categories = dropdown.
// Data: /api/public-categories/menu (B2B/B2C filtering server-side).

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";

const getUserTypeForLink = () => {
  if (typeof window === "undefined") return "b2c";
  const userType = localStorage.getItem("userType");
  return userType === "partner" || userType === "b2b" ? "b2b" : "b2c";
};

export default function CategoryNav() {
  const [menu, setMenu] = useState([]);
  const [openId, setOpenId] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const userType = localStorage.getItem("userType") || "b2c";
        const res = await axios.get(`/api/public-categories/menu?userType=${userType}`);
        setMenu(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load category menu:", err);
        setMenu([]);
      }
    };

    fetchMenu();
  }, []);

  // bahar click / Esc pe dropdown band
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenId(null);
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpenId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  if (!menu.length) return null;

  const categoryLink = (slug) => ({
    pathname: `/category/${slug}`,
    query: { userType: getUserTypeForLink() },
  });

  return (
    <div className="category-nav">
      <div className="container">
        <ul className="category-nav-list" ref={navRef}>
          {menu.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isOpen = openId === cat._id;

            return (
              <li
                key={cat._id}
                className={`category-nav-item ${isOpen ? "is-open" : ""}`}
                onMouseEnter={() => hasChildren && setOpenId(cat._id)}
                onMouseLeave={() => hasChildren && setOpenId(null)}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className="category-nav-link"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : cat._id)}
                  >
                    {cat.name}
                    <span className="category-nav-caret" aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    href={categoryLink(cat.slug)}
                    className="category-nav-link"
                    onClick={() => setOpenId(null)}
                  >
                    {cat.name}
                  </Link>
                )}

                {hasChildren && (
                  <div className="category-dropdown">
                    <ul>
                      <li>
                        <Link
                          href={categoryLink(cat.slug)}
                          className="category-dropdown-all"
                          onClick={() => setOpenId(null)}
                        >
                          All {cat.name}
                        </Link>
                      </li>
                      {cat.children.map((child) => (
                        <li key={child._id}>
                          <Link
                            href={categoryLink(child.slug)}
                            onClick={() => setOpenId(null)}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
