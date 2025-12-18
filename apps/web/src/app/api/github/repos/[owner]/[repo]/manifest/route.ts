import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

interface ManifestJson {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  permissions?: string[];
  entry?: string;
  provides?: {
    providers?: string[];
    actions?: string[];
    ai_tools?: string[];
  };
  ai_tool_schemas?: Record<string, unknown>;
}

/**
 * GET /api/github/repos/[owner]/[repo]/manifest
 * Fetch manifest.json from a GitHub repository
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { owner, repo } = await params;

    // Get the GitHub connected account
    const githubAccount = await user.getConnectedAccount("github");

    if (!githubAccount) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
    }

    const tokenResult = await githubAccount.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: "GitHub token expired" },
        { status: 401 }
      );
    }

    // Get the branch and path from query params
    const searchParams = request.nextUrl.searchParams;
    const branch = searchParams.get("branch") || "main";
    const pluginPath = searchParams.get("path") || "";
    
    // Build the manifest path
    const manifestPath = pluginPath 
      ? `${pluginPath}/manifest.json`
      : "manifest.json";

    // Try to fetch manifest.json from the repository
    const manifestResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${manifestPath}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!manifestResponse.ok) {
      if (manifestResponse.status === 404) {
        return NextResponse.json(
          {
            error: "Manifest not found",
            message: "No manifest.json found in the repository root",
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch manifest" },
        { status: manifestResponse.status }
      );
    }

    const fileData = await manifestResponse.json();

    // GitHub returns base64 encoded content
    if (!fileData.content) {
      return NextResponse.json(
        { error: "Invalid manifest file" },
        { status: 400 }
      );
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Parse JSON
    let manifest: ManifestJson;
    try {
      manifest = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Invalid manifest JSON" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!manifest.id || !manifest.name) {
      return NextResponse.json(
        {
          error: "Invalid manifest",
          message: "Manifest must include 'id' and 'name' fields",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      manifest,
      sha: fileData.sha,
      path: fileData.path,
    });
  } catch (error) {
    console.error("Error fetching manifest:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifest" },
      { status: 500 }
    );
  }
}

