/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/clerk.browser.js',
        destination: '/clerk.browser.js',
      },
      {
        source: '/dist/:path*',
        destination: '/dist/:path*',
      },
      {
        source: '/npm/@clerk/clerk-js@5/dist/:path*',
        destination: '/dist/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/clerk.browser.js',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/dist/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
