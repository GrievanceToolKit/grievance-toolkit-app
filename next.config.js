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
};

module.exports = nextConfig;
