import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AuthForm from "./AuthForm";

// Once a visitor closes or completes the popup it stays away for the rest of
// the browser session
const SEEN_KEY = "loginPopupSeen";

// The popup would be in the way on these: the login screens already show the
// same form, and the admin/dashboard areas are behind their own sign-in
const SKIP_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/admin",
  "/dashboard",
  "/invite",
  "/checkout",
];

// How long after the page settles the popup appears
const SHOW_AFTER_MS = 1500;

const LoginPopup = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private browsing can block storage — the popup simply shows again
    }
  };

  useEffect(() => {
    if (open) return;

    const path = router.pathname || "";
    if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

    let token = null;
    let seen = null;
    try {
      token = localStorage.getItem("token");
      seen = sessionStorage.getItem(SEEN_KEY);
    } catch {
      return;
    }

    // Someone who is already signed in does not need this
    if (token || seen) return;

    const timer = setTimeout(() => {
      try {
        // They may have signed in through the header while we were waiting
        if (localStorage.getItem("token")) return;
      } catch {
        return;
      }
      setOpen(true);
    }, SHOW_AFTER_MS);

    return () => clearTimeout(timer);
  }, [router.pathname, open]);

  // Escape closes it, and the page behind must not scroll while it is up
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleSuccess = ({ pendingApproval }) => {
    close();
    // A fresh partner account cannot log in yet, so there is nothing to reload
    if (!pendingApproval) {
      setTimeout(() => router.reload(), 800);
    }
  };

  return (
    <div
      className="login-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to One Prime Studios"
      onClick={close}
    >
      <div className="login-popup-box" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="login-popup-close"
          onClick={close}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Retail sign-in only — partners sign in from /login */}
        <AuthForm popup customerOnly onSuccess={handleSuccess} />
      </div>

      <style jsx global>{`
        .login-popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(17, 17, 17, 0.62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
          animation: loginPopupFade 0.2s ease-out;
        }

        .login-popup-box {
          position: relative;
          width: 100%;
          /* A small sign-in card: no side image, one column */
          max-width: 400px;
          max-height: 92vh;
          overflow: hidden;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
          animation: loginPopupRise 0.25s ease-out;
        }

        .login-popup-close {
          position: absolute;
          top: 12px;
          right: 14px;
          z-index: 2;
          width: 34px;
          height: 34px;
          line-height: 1;
          font-size: 26px;
          color: #333;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-popup-close:hover {
          background: #f2f2f2;
        }

        /* The login page fills the screen; inside the popup it has to size to
           its own content and scroll on its own */
        .login-popup-box .auth-popup-container {
          height: auto;
          max-height: 92vh;
        }

        .login-popup-box .auth-popup-container .auth-form-section {
          flex: 1;
          width: 100%;
          padding: 30px 26px 26px;
          max-height: 92vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #d6d9e0 transparent;
        }

        .login-popup-box
          .auth-popup-container
          .auth-form-section::-webkit-scrollbar {
          width: 6px;
        }

        .login-popup-box
          .auth-popup-container
          .auth-form-section::-webkit-scrollbar-thumb {
          background: #d6d9e0;
          border-radius: 999px;
        }

        .login-popup-box .auth-popup-container .logo {
          margin-bottom: 18px;
        }

        .login-popup-box .auth-popup-container .logo img {
          max-height: 46px;
        }

        @keyframes loginPopupFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes loginPopupRise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 767px) {
          .login-popup-overlay {
            padding: 12px;
          }

          .login-popup-box {
            max-width: 100%;
          }

          .login-popup-box .auth-popup-container .auth-form-section {
            padding: 28px 18px 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPopup;
