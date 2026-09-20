/** @type {import('next').NextConfig} */

// NEXT_EXPORT=true → static HTML export (for Tauri desktop bundle)
// Default (undefined / false) → standalone server output (for VPS / Docker deployment)
const isExport = process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: isExport ? 'export' : 'standalone',
  distDir: isExport ? 'out' : '.next',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
  async redirects() {
    return [
      // Redirect /download → GitHub releases (placeholder — update URL when release is published)
      {
        source: '/download',
        destination: 'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
