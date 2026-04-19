/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
}

module.exports = nextConfig