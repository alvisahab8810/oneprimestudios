import "@/styles/globals.css";
import Head from "next/head";
import Script from "next/script";
import { Toaster } from "react-hot-toast";

import "react-quill/dist/quill.snow.css"; // if using react-quill

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

      <Component {...pageProps} />
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
