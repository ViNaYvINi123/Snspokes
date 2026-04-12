const nextConfig = {
  // Limit build parallelism to prevent worker crashes in constrained environments
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  // ── Output mode: standalone = smallest Docker image ────
  output: 'standalone',

  // ── Image optimization ─────────────────────────────────
  images: {
    domains: ['store.servicenow.com', 'logo.clearbit.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,  // cache optimized images 24h
  },

  // ── Security ───────────────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,

  // ── Compression (handled by Nginx, disable in Node) ────
  compress: false,

  // ── Webpack optimizations ──────────────────────────────
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false, tls: false, fs: false, dns: false, 'pg-native': false,
      };
    }
    // Production: minimize aggressively
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        moduleIds: 'deterministic',
      };
    }
    return config;
  },

  // ── HTTP headers ───────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Static assets: 1 year cache (Nginx also handles this)
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  env: {
    NEXT_PUBLIC_APP_URL:          process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID:  process.env.RAZORPAY_KEY_ID,
  },
};

// ── API body size limit (prevent abuse) ──────────────────
nextConfig.api = {
  bodyParser: { sizeLimit: '1mb' },
  responseLimit: '4mb',
};

module.exports = nextConfig;
