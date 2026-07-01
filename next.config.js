/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (replace <project-ref> with your actual Supabase project ref)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/render/**',
      },
      // Allow CDN-served Supabase assets
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // API routes — prevent caching sensitive data
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },

  // Silence noisy but harmless warnings from @auth/prisma-adapter
  webpack(config) {
    config.externals = [...(config.externals ?? []), { 'utf-8-validate': 'commonjs utf-8-validate', bufferutil: 'commonjs bufferutil' }]
    return config
  },

  // Enable React strict mode for safer development
  reactStrictMode: true,

  // Reduce bundle size — exclude large packages from client bundle
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
}

module.exports = nextConfig
