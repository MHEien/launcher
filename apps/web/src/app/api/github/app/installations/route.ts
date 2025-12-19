/**
 * GitHub App Installations API
 * 
 * Check if the GitHub App is installed on a repository and get installation info.
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GITHUB_APP_SLUG = process.env.GITHUB_APP_SLUG || "launcher-plugin-builder";

/**
 * Generate JWT for GitHub App authentication
 */
function generateAppJWT(): string {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App not configured");
  }

  // We need jsonwebtoken here - import dynamically to avoid issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jwt = require("jsonwebtoken");
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + (10 * 60),
    iss: GITHUB_APP_ID,
  };

  return jwt.sign(payload, GITHUB_APP_PRIVATE_KEY, { algorithm: "RS256" });
}

/**
 * GET /api/github/app/installations
 * Check if the app is installed on a specific repository
 */
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    // Check if GitHub App is configured
    if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
      return NextResponse.json({
        configured: false,
        message: "GitHub App not configured on server",
      });
    }

    // If owner/repo provided, check installation for that repo
    if (owner && repo) {
      try {
        const appJwt = generateAppJWT();
        
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/installation`,
          {
            headers: {
              Authorization: `Bearer ${appJwt}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        if (response.status === 404) {
          return NextResponse.json({
            configured: true,
            installed: false,
            installUrl: `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`,
          });
        }

        if (!response.ok) {
          const error = await response.text();
          console.error("GitHub API error:", error);
          return NextResponse.json({
            configured: true,
            installed: false,
            error: "Failed to check installation",
          });
        }

        const installation = await response.json();
        return NextResponse.json({
          configured: true,
          installed: true,
          installationId: installation.id,
          account: {
            login: installation.account.login,
            type: installation.account.type,
          },
        });
      } catch (error) {
        console.error("Error checking installation:", error);
        return NextResponse.json({
          configured: true,
          installed: false,
          error: "Failed to check installation",
        });
      }
    }

    // No owner/repo - just return configuration status
    return NextResponse.json({
      configured: true,
      appSlug: GITHUB_APP_SLUG,
      installUrl: `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`,
    });
  } catch (error) {
    console.error("GitHub installations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


