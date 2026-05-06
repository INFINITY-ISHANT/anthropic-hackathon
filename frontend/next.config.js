/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  async rewrites() {
    // Browser → /api/v1/* gets proxied to the backend by Next, so client-side
    // calls never hit CORS. Server components bypass this and call the backend
    // directly (see lib/api.ts BASE selection).
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
