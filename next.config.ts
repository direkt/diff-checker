import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for performance optimization
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'react-syntax-highlighter', 'recharts'],
    
    // Turbopack configuration
    turbo: {
      // Exclude large directories from file watching and compilation
      resolveAlias: {
        // Add any necessary aliases here
      },
      // Configure module resolution for better performance
      moduleIdStrategy: 'deterministic',
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

  // Configure what files to ignore during development
  watchOptions: {
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
    ],
  },
};

export default nextConfig;
