/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // BFF proxy buffers POST bodies (default 10 MB); agent document uploads are base64 JSON.
    proxyClientMaxBodySize: '150mb',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
