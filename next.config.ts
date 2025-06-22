import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for performance optimization
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'react-syntax-highlighter', 'recharts'],
  },
  
  // Turbopack configuration (moved from experimental as it's now stable)
  turbopack: {
    // Exclude large directories from file watching and compilation
    resolveAlias: {
      // Add any necessary aliases here
    },
  },

  // Optimize for development performance
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize images
  images: {
    // Optimize image loading
    formats: ['image/webp', 'image/avif'],
  },

  // Configure page extensions (only include relevant file types)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Webpack configuration for better performance
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Exclude large directories from webpack watching
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/dremio/**',
          '**/test3/**', 
          '**/nomura/**',
          '**/well-check/**',
          '**/.next/**',
          '**/.git/**',
          '**/*.md',
          '**/*.py',
          '**/*.parquet',
          '**/venv/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
