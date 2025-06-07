// next.config.js
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/new',
        destination: '/grievances/new',
        permanent: true,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
