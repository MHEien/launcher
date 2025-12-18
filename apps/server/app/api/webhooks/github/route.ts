/**
 * GitHub Webhook Handler
 * 
 * Receives webhook events from GitHub and triggers plugin builds
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb, plugins, pluginBuilds, eq } from "@/lib/db";
import { triggerBuild } from "@/lib/build";

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

interface GitHubReleasePayload {
  action: string;
  release: {
    id: number;
    tag_name: string;
    name: string;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    tarball_url: string;
    zipball_url: string;
    html_url: string;
    published_at: string;
    author: {
      login: string;
      avatar_url: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  sender: {
    login: string;
  };
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const hmac = createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Parse version from git tag
 * Handles tags like "v1.0.0", "1.0.0", "release-1.0.0"
 */
function parseVersionFromTag(tag: string): string {
  // Remove common prefixes
  const cleaned = tag
    .replace(/^v/i, "")
    .replace(/^release[-/]/i, "");
  
  // Check if it's a valid semver
  if (/^\d+\.\d+\.\d+/.test(cleaned)) {
    // Extract just the semver part
    const match = cleaned.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : cleaned;
  }
  
  return cleaned;
}

// GET /api/webhooks/github - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "GitHub webhook endpoint is active",
    configured: !!GITHUB_WEBHOOK_SECRET,
  });
}

// POST /api/webhooks/github - Receive GitHub webhook events
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256") || undefined;
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify signature
  if (!verifySignature(rawBody, signature)) {
    console.error("Invalid webhook signature for delivery:", deliveryId);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse the payload
  let payload: GitHubReleasePayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  console.log(`Received GitHub webhook: ${event} (${deliveryId})`);

  // Handle ping event (sent when webhook is created)
  if (event === "ping") {
    console.log("Webhook ping received:", payload);
    return NextResponse.json({ message: "pong" });
  }

  // Only handle release events
  if (event !== "release") {
    return NextResponse.json({ message: "Event type not handled", event });
  }

  // Only handle published releases (not drafts)
  if (payload.action !== "published") {
    console.log(`Ignoring release action: ${payload.action}`);
    return NextResponse.json({ message: "Release action not handled", action: payload.action });
  }

  // Skip draft releases
  if (payload.release.draft) {
    console.log("Ignoring draft release");
    return NextResponse.json({ message: "Draft releases are ignored" });
  }

  const { release, repository } = payload;

  console.log(`Processing release: ${release.tag_name} for ${repository.full_name}`);

  try {
    const db = getDb();

    // Find the plugin associated with this repository
    const plugin = await db.query.plugins.findFirst({
      where: eq(plugins.githubRepoId, repository.id),
    });

    if (!plugin) {
      console.log(`No plugin found for repository: ${repository.full_name} (ID: ${repository.id})`);
      return NextResponse.json({
        message: "No plugin associated with this repository",
        repositoryId: repository.id,
      });
    }

    console.log(`Found plugin: ${plugin.id} for repository ${repository.full_name}`);

    // Parse version from tag
    const version = parseVersionFromTag(release.tag_name);

    // Create a build record
    const [build] = await db
      .insert(pluginBuilds)
      .values({
        pluginId: plugin.id,
        version,
        status: "pending",
        githubReleaseId: release.id,
        githubReleaseTag: release.tag_name,
        githubReleaseName: release.name,
        tarballUrl: release.tarball_url,
      })
      .returning();

    console.log(`Created build record: ${build.id} for version ${version}`);

    // Trigger the build asynchronously
    // Don't await - let it run in the background
    triggerBuild(build.id, {
      pluginId: plugin.id,
      version,
      tarballUrl: release.tarball_url,
      releaseTag: release.tag_name,
      changelog: release.body ?? undefined,
      isPrerelease: release.prerelease,
      pluginPath: plugin.githubPluginPath ?? undefined, // For monorepos
    }).catch((error) => {
      console.error(`Build failed for ${plugin.id}@${version}:`, error);
    });

    return NextResponse.json({
      message: "Build triggered",
      buildId: build.id,
      pluginId: plugin.id,
      version,
    });
  } catch (error) {
    console.error("Error processing GitHub webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

