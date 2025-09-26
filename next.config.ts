import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ OPTIMIZACIONES DE PERFORMANCE
  experimental: {
    // Optimizar imports de paquetes comunes
    optimizePackageImports: [
      'lucide-react',
      'recharts', 
      'chart.js',
      'react-chartjs-2',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select'
    ],
  },
  
  // ✅ TURBOPACK CONFIG (estable en Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // ✅ COMPRESIÓN Y OPTIMIZACIÓN
  compress: true,
  
  // ✅ OPTIMIZACIÓN DE IMÁGENES
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 1 día
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ✅ HEADERS DE SEGURIDAD Y CACHE
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // ✅ WEBPACK OPTIMIZATIONS
  webpack: (config, { dev, isServer }) => {
    // Solo en producción
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
