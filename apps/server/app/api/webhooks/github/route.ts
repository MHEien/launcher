/**
 * GitHub Webhook Handler
 * 
 * Receives webhook events from GitHub App and triggers plugin builds.
 * Handles both release events (to build plugins) and installation events
 * (to track which repos have the app installed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, plugins, pluginBuilds, eq } from "@/lib/db";
import { triggerBuild } from "@/lib/build";
import { verifyWebhookSignature, getInstallationToken, isGitHubAppConfigured } from "@/lib/github";

interface GitHubReleasePayload {
  action: string;
  installation?: {
    id: number;
  };
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

interface GitHubInstallationPayload {
  action: "created" | "deleted" | "suspend" | "unsuspend" | "new_permissions_accepted";
  installation: {
    id: number;
    account: {
      login: string;
      id: number;
      type: "User" | "Organization";
    };
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
  sender: {
    login: string;
  };
}

interface GitHubInstallationReposPayload {
  action: "added" | "removed";
  installation: {
    id: number;
  };
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
  repositories_removed?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
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

/**
 * Handle installation events - track which repos have the app installed
 */
async function handleInstallationEvent(
  payload: GitHubInstallationPayload
): Promise<NextResponse> {
  const db = getDb();
  const { action, installation, repositories } = payload;

  console.log(`Installation ${action} for account: ${installation.account.login}`);

  if (action === "created" && repositories) {
    // App was installed - update any matching plugins with the installation ID
    for (const repo of repositories) {
      const plugin = await db.query.plugins.findFirst({
        where: eq(plugins.githubRepoId, repo.id),
      });

      if (plugin) {
        await db
          .update(plugins)
          .set({
            githubInstallationId: installation.id,
            updatedAt: new Date(),
          })
          .where(eq(plugins.id, plugin.id));
        
        console.log(`Updated plugin ${plugin.id} with installation ${installation.id}`);
      }
    }
  } else if (action === "deleted") {
    // App was uninstalled - clear installation ID from affected plugins
    await db
      .update(plugins)
      .set({
        githubInstallationId: null,
        updatedAt: new Date(),
      })
      .where(eq(plugins.githubInstallationId, installation.id));
    
    console.log(`Cleared installation ${installation.id} from plugins`);
  }

  return NextResponse.json({ message: `Installation ${action} handled` });
}

/**
 * Handle repository added/removed from installation
 */
async function handleInstallationReposEvent(
  payload: GitHubInstallationReposPayload
): Promise<NextResponse> {
  const db = getDb();
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (action === "added" && repositories_added) {
    for (const repo of repositories_added) {
      const plugin = await db.query.plugins.findFirst({
        where: eq(plugins.githubRepoId, repo.id),
      });

      if (plugin) {
        await db
          .update(plugins)
          .set({
            githubInstallationId: installation.id,
            updatedAt: new Date(),
          })
          .where(eq(plugins.id, plugin.id));
        
        console.log(`Added installation ${installation.id} to plugin ${plugin.id}`);
      }
    }
  } else if (action === "removed" && repositories_removed) {
    for (const repo of repositories_removed) {
      const plugin = await db.query.plugins.findFirst({
        where: eq(plugins.githubRepoId, repo.id),
      });

      if (plugin) {
        await db
          .update(plugins)
          .set({
            githubInstallationId: null,
            updatedAt: new Date(),
          })
          .where(eq(plugins.id, plugin.id));
        
        console.log(`Removed installation from plugin ${plugin.id}`);
      }
    }
  }

  return NextResponse.json({ message: `Repositories ${action} handled` });
}

// GET /api/webhooks/github - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "GitHub webhook endpoint is active",
    configured: isGitHubAppConfigured(),
  });
}

// POST /api/webhooks/github - Receive GitHub webhook events
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256") || undefined;
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify signature using GitHub App library
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("Invalid webhook signature for delivery:", deliveryId);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse the payload
  let payload: GitHubReleasePayload | GitHubInstallationPayload | GitHubInstallationReposPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  console.log(`Received GitHub webhook: ${event} (${deliveryId})`);

  // Handle ping event (sent when webhook is created)
  if (event === "ping") {
    console.log("Webhook ping received");
    return NextResponse.json({ message: "pong" });
  }

  // Handle installation events
  if (event === "installation") {
    return handleInstallationEvent(payload as GitHubInstallationPayload);
  }

  // Handle installation_repositories events
  if (event === "installation_repositories") {
    return handleInstallationReposEvent(payload as GitHubInstallationReposPayload);
  }

  // Only handle release events from here
  if (event !== "release") {
    return NextResponse.json({ message: "Event type not handled", event });
  }

  const releasePayload = payload as GitHubReleasePayload;

  // Only handle published releases (not drafts)
  if (releasePayload.action !== "published") {
    console.log(`Ignoring release action: ${releasePayload.action}`);
    return NextResponse.json({ message: "Release action not handled", action: releasePayload.action });
  }

  // Skip draft releases
  if (releasePayload.release.draft) {
    console.log("Ignoring draft release");
    return NextResponse.json({ message: "Draft releases are ignored" });
  }

  const { release, repository, installation } = releasePayload;

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

    // Update installation ID if we have it and plugin doesn't
    if (installation?.id && !plugin.githubInstallationId) {
      await db
        .update(plugins)
        .set({
          githubInstallationId: installation.id,
          updatedAt: new Date(),
        })
        .where(eq(plugins.id, plugin.id));
    }

    // Parse version from tag
    const version = parseVersionFromTag(release.tag_name);

    // Get authenticated tarball URL if we have installation access
    let authenticatedTarballUrl = release.tarball_url;
    const installationId = installation?.id || plugin.githubInstallationId;
    
    if (installationId) {
      try {
        const { token } = await getInstallationToken(installationId);
        // For private repos, we need to use the authenticated URL
        authenticatedTarballUrl = `${release.tarball_url}?access_token=${token}`;
      } catch (error) {
        console.warn("Could not get installation token, using public URL:", error);
      }
    }

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
        tarballUrl: authenticatedTarballUrl,
      })
      .returning();

    console.log(`Created build record: ${build.id} for version ${version}`);

    // Trigger the build asynchronously
    // Don't await - let it run in the background
    triggerBuild(build.id, {
      pluginId: plugin.id,
      version,
      tarballUrl: authenticatedTarballUrl,
      releaseTag: release.tag_name,
      changelog: release.body ?? undefined,
      isPrerelease: release.prerelease,
      pluginPath: plugin.githubPluginPath ?? undefined, // For monorepos
      installationId: installationId ?? undefined, // Pass for authenticated downloads
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

