const nextConfig = {
  images: { domains: ['store.servicenow.com', 'logo.clearbit.com'] },
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false, tls: false, fs: false, dns: false, 'pg-native': false,
      };
    }
    return config;
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ]}];
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  },
};
module.exports = nextConfig;
