import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Security headers
  const response = NextResponse.next()
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Content Security Policy - Enhanced to prevent PrismJS DOM clobbering
  const cspDirectives = [
    "default-src 'self'",
    isDevelopment 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:" // Allow blob: for Turbopack HMR
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Production script policy
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    isDevelopment
      ? "connect-src 'self' ws: wss:" // Allow WebSocket connections for HMR
      : "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'" // Prevent embedding
  ]
  
  // Only add trusted types in production to avoid breaking Turbopack HMR
  if (!isDevelopment) {
    cspDirectives.push("require-trusted-types-for 'script'")
  }
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', ')
  )
  
  // Remove server information
  response.headers.delete('X-Powered-By')
  
  // Validate file uploads - only allow JSON and ZIP files
  if (request.method === 'POST' && request.url.includes('/api/')) {
    const contentType = request.headers.get('content-type')
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return new NextResponse('Invalid content type', { status: 400 })
    }
  }
  
  // Block requests to sensitive files
  const pathname = request.nextUrl.pathname
  const sensitivePatterns = [
    '/\\.env',
    '/\\.git',
    '/\\.pem$',
    '/\\.key$',
    '/\\.p12$',
    '/\\.pfx$',
    '/\\.jks$',
    '/config/',
    '/logs/',
    '/\\.log$',
    '/backup',
    '/admin',
    '/debug'
  ]
  
  if (sensitivePatterns.some(pattern => new RegExp(pattern, 'i').test(pathname))) {
    return new NextResponse('Not Found', { status: 404 })
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}