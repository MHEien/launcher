import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================
// CORS Configuration
// ============================================

// Origins allowed to make cross-origin requests
const allowedOrigins = [
  // Development
  "http://localhost:3000", // Web app (dev)
  "http://localhost:3001", // Server API (dev)
  "http://localhost:1420", // Tauri dev server
  
  // Tauri deep link / webview origins
  "tauri://localhost",
  "https://tauri.localhost",
  
  // Production - will be set via environment
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SERVER_URL,
].filter(Boolean) as string[];

// API routes that need CORS (called by desktop app)
const corsApiRoutes = [
  "/api/auth/desktop",
  "/api/releases",
  "/api/plugins",
];

// ============================================
// Security Headers
// ============================================

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// ============================================
// Rate Limiting (simple in-memory, use Redis in production)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

// Cleanup old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

// ============================================
// Helper Functions
// ============================================

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Allow all Tauri origins
  if (origin.startsWith("tauri://") || origin === "https://tauri.localhost") {
    return true;
  }
  
  // Allow localhost in development
  if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
    return true;
  }
  
  return allowedOrigins.includes(origin);
}

function needsCors(pathname: string): boolean {
  return corsApiRoutes.some(route => pathname.startsWith(route));
}

function getCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// ============================================
// Middleware
// ============================================

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");
  const isApiRoute = pathname.startsWith("/api");
  
  // ----------------------------------------
  // Rate limiting for API routes
  // ----------------------------------------
  if (isApiRoute) {
    const ip = getClientIp(request);
    const { allowed, remaining } = checkRateLimit(ip);
    
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            ...securityHeaders,
          },
        }
      );
    }
    
    // Add rate limit headers to response later
    const rateLimitHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
      "X-RateLimit-Remaining": String(remaining),
    };
    
    // ----------------------------------------
    // CORS for desktop app API access
    // ----------------------------------------
    if (needsCors(pathname) && origin) {
      const originAllowed = isOriginAllowed(origin);
      
      // Handle preflight (OPTIONS) requests
      if (request.method === "OPTIONS") {
        if (originAllowed) {
          return new NextResponse(null, {
            status: 204,
            headers: {
              ...getCorsHeaders(origin),
              ...rateLimitHeaders,
            },
          });
        } else {
          return new NextResponse(null, { status: 403 });
        }
      }
      
      // Add CORS headers to actual requests
      if (originAllowed) {
        const response = NextResponse.next();
        
        Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        
        return response;
      }
    }
    
    // Add security headers to all API responses
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  // ----------------------------------------
  // Security headers for all other routes
  // ----------------------------------------
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// ============================================
// Middleware Config
// ============================================

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all pages except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

