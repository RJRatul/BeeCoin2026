/** @type {import('next').NextConfig} */
const nextConfig = {
  // Socket.io requests "/socket.io/?..." — don't 308-redirect away the trailing slash
  // (a redirected POST breaks the polling transport).
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cryptax.live',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'cryptax.live',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'www.cryptax.live',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '159.198.46.221',
        pathname: '/uploads/**',
      },
    ],
  },
  // Your existing rewrites if any
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
      // Socket.io (polling transport) — the client connects to the page origin
      {
        source: '/socket.io',
        destination: 'http://localhost:5000/socket.io/',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:5000/socket.io/:path*',
      },
    ];
  },
}

module.exports = nextConfig