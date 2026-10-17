
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
// };

// export default nextConfig;




/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Allow Next.js Image Optimization from your domain
  images: {
    domains: ['oneprimestudios.com'],
  },

  // Invoice and e-way bill PDFs used to be served straight out of /public,
  // where anyone could guess a file name. Old links stored in the database are
  // sent to an admin-only route instead; beforeFiles runs ahead of the static
  // folder, so a leftover file there is no longer handed out either.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/invoices/:path*", destination: "/api/admin/documents/legacy/invoices/:path*" },
        { source: "/eway-bills/:path*", destination: "/api/admin/documents/legacy/eway-bills/:path*" },
      ],
    };
  },

  // ✅ Expose environment variable for image URLs
  env: {
    NEXT_PUBLIC_FILE_URL: 'https://oneprimestudios.com',
  },
};

export default nextConfig;
