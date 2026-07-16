/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Enable styled-components SWC transform (SSR, better class names, minification).
    styledComponents: true,
  },
};

export default nextConfig;
