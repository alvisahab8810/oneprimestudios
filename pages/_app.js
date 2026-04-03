import "@/styles/globals.css";
import Head from "next/head";
import Script from "next/script";
import { Toaster, toast } from "react-hot-toast";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";

import "react-quill/dist/quill.snow.css"; // if using react-quill

// NEW: checks /api/auth/me whenever the user is active (click, key, tab focus)
// and also on a 5-second poll interval.
// If server returns 401 (partner revoked), clears localStorage and
// redirects to /login immediately — no page refresh needed.
function useRevocationGuard() {
  const router = useRouter();
  const intervalRef = useRef(null);
  const checkingRef = useRef(false); // prevent concurrent checks

  useEffect(() => {
    const check = async () => {
      if (checkingRef.current) return;
      const token = localStorage.getItem("token");
      if (!token) return; // not logged in — nothing to check

      checkingRef.current = true;
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          // Clear all local state immediately so header/nav update
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("userType");
          localStorage.removeItem("name");
          localStorage.removeItem("email");
          localStorage.removeItem("appliedCoupon");
          clearInterval(intervalRef.current);
          toast.error("Your account access has been revoked. Please contact support.");
          router.replace("/login");
        }
      } catch {
        // Network error — silently ignore, will retry next tick
      } finally {
        checkingRef.current = false;
      }
    };

    // 1. Check immediately on mount / route change
    check();

    // 2. Poll every 5 seconds
    intervalRef.current = setInterval(check, 5000);

    // 3. Check on any user interaction (click, keydown) — catches activity instantly
    const onActivity = () => check();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);

    // 4. Check when user returns to the tab
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
}

function AppContent({ Component, pageProps }) {
  useRevocationGuard();
  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link
          rel="icon"
          type="image/x-icon"
          href="/assets/images/favicon.png"
        />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />

        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/responsive.css" />

        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@2.2.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
        />
        <link href="/assets/css/font-awesome.min.css" rel="stylesheet" />

        <title>One Prime Studios</title>

        {/* Non-Critical Scripts */}
      </Head>

      <Script
        src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"
        strategy="lazyOnload"
      />
      <Script src="/assets/js/jquery-3.6.0.min.js" defer></Script>

      <Script src="/assets/js/bootstrap.bundle.min.js" defer></Script>

      <AppContent Component={Component} pageProps={pageProps} />
      <Toaster
        position="top-right" // 👈 toast position
        reverseOrder={false}
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        }}
      />
    </>
  );

  // <Component {...pageProps} />;
}
