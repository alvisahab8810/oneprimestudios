import Head from "next/head";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import Footer from "@/components/footer/Footer";
import BlogList from "@/components/blogs/BlogList";

export default function BlogsPage() {
  return (
    <>
      <Head>
        <title>Blog | One Prime Studios</title>
        <meta
          name="description"
          content="Guides and ideas on custom merchandise, corporate gifting, printing and branding from One Prime Studios."
        />
        <link rel="stylesheet" href="/assets/css/blogs.css" />
      </Head>
      <Topbar />
      <Offcanvas />
      <div className="bl-page-hero">
        <span className="bl-page-hero-eyebrow">One Prime Studios Blog</span>
        <h1>Make your brand something people keep</h1>
        <p>Merchandise ideas, gifting guides and printing know-how for businesses of every size.</p>
      </div>
      <BlogList />
      <Footer />
    </>
  );
}
