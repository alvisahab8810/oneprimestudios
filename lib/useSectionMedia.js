"use client";
import { useEffect, useState } from "react";

// Reads one of the areas an admin manages from the dashboard. It returns an
// empty list until the request lands, and also whenever that area has nothing
// in it, so every component can keep showing its built-in content as the
// fallback and only swap over once there is something to show.
export default function useSectionMedia(section) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;

    fetch(`/api/action-media?section=${encodeURIComponent(section)}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data?.items) && data.items.length) setItems(data.items);
      })
      .catch(() => {
        // The built-in content stays on screen rather than breaking the page
      });

    return () => {
      alive = false;
    };
  }, [section]);

  return items;
}
