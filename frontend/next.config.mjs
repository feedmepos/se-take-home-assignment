/** @type {import('next').NextConfig} */
const nextConfig = {
  // To allow cross-origin requests from the backend if needed (though usually it's the other way)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
