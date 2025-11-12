
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

  // ✅ Expose environment variable for image URLs
  env: {
    NEXT_PUBLIC_FILE_URL: 'https://oneprimestudios.com',
  },
};

export default nextConfig;
