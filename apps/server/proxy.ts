import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================
// CORS Configuration
// ============================================

const allowedOrigins = [
  // Development
  "http://localhost:3000", // Web app (dev)
  "http://localhost:3001", // Server itself (dev)
  "http://localhost:1420", // Tauri dev server
  
  // Tauri deep link / webview origins (various platforms)
  "tauri://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",  // Windows WebView2 may use http
  
  // Production - will be set via environment
  process.env.NEXT_PUBLIC_WEB_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

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
// Rate Limiting
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 200; // 200 requests per minute (higher for API server)

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
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 60000);
}

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
  if (!origin) return true; // Same-origin requests have no origin header
  
  // Allow all Tauri origins (various formats across platforms)
  if (
    origin.startsWith("tauri://") || 
    origin === "https://tauri.localhost" ||
    origin === "http://tauri.localhost" ||
    origin === "null" // Some WebViews send literal "null" string
  ) {
    return true;
  }
  
  // Allow localhost in development
  if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
    return true;
  }
  
  return allowedOrigins.includes(origin);
}

function getCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-Requested-With, X-Service-Key",
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
  
  // Only apply middleware to API routes
  if (!isApiRoute) {
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  // ----------------------------------------
  // Rate limiting
  // ----------------------------------------
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
  
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(remaining),
  };
  
  // ----------------------------------------
  // CORS handling
  // ----------------------------------------
  const originAllowed = isOriginAllowed(origin);
  
  // Handle preflight (OPTIONS) requests
  if (request.method === "OPTIONS") {
    // For OPTIONS, we need to be more permissive for desktop apps
    // Desktop apps (like Tauri) may send null origin or no origin at all
    if (originAllowed) {
      // Use the origin if provided, otherwise use a wildcard for same-origin/desktop requests
      const corsOrigin = origin || "*";
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...getCorsHeaders(corsOrigin),
          ...rateLimitHeaders,
        },
      });
    } else {
      // Origin is explicitly not allowed
      return new NextResponse(null, { status: 403 });
    }
  }
  
  // ----------------------------------------
  // Add headers to response
  // ----------------------------------------
  const response = NextResponse.next();
  
  // Add CORS headers if origin is allowed
  if (originAllowed && origin) {
    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  // Add rate limit headers
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add security headers
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
  ],
};
