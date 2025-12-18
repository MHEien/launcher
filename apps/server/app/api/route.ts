import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Launcher API Server",
    version: "1.0.0",
    status: "healthy",
    endpoints: {
      // AI endpoints
      aiChat: "POST /api/ai/chat",
      aiModels: "GET /api/ai/models",
      aiTools: "GET /api/ai/tools",
      // Plugin registry endpoints
      plugins: "GET /api/plugins",
      pluginDetails: "GET /api/plugins/:id",
      pluginDownload: "GET /api/plugins/:id/download",
      pluginRatings: "GET /api/plugins/:id/ratings",
      categories: "GET /api/categories",
      trending: "GET /api/trending",
      featured: "GET /api/featured",
      // Auth required endpoints
      createPlugin: "POST /api/plugins",
      updatePlugin: "PATCH /api/plugins/:id",
      publishVersion: "POST /api/plugins/:id/versions",
      submitRating: "POST /api/plugins/:id/ratings",
    },
  });
}

