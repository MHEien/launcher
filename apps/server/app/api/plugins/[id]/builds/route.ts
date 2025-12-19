import { NextRequest, NextResponse } from "next/server";
import { getPluginBuilds, triggerBuild } from "@/lib/build";
import { getDb, plugins, pluginBuilds, eq } from "@/lib/db";
import { getLatestRelease, isGitHubAppConfigured } from "@/lib/github";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Parse version from git tag
 */
function parseVersionFromTag(tag: string): string {
  const cleaned = tag.replace(/^v/i, "").replace(/^release[-/]/i, "");
  if (/^\d+\.\d+\.\d+/.test(cleaned)) {
    const match = cleaned.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : cleaned;
  }
  return cleaned;
}

// GET /api/plugins/:id/builds - Get builds for a plugin
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: pluginId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    
    const builds = await getPluginBuilds(pluginId, Math.min(limit, 50));
    return NextResponse.json({ builds });
  } catch (error) {
    console.error("Error getting plugin builds:", error);
    return NextResponse.json({ error: "Failed to get plugin builds" }, { status: 500 });
  }
}

// POST /api/plugins/:id/builds - Manually trigger a build from latest GitHub release
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify user is authenticated
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: pluginId } = await params;
    const db = getDb();

    // Get the plugin and verify ownership
    const plugin = await db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
    });

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    if (plugin.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized to trigger builds for this plugin" }, { status: 403 });
    }

    // Check if GitHub App is configured
    if (!isGitHubAppConfigured()) {
      return NextResponse.json(
        { error: "GitHub App not configured on server" },
        { status: 503 }
      );
    }

    // Check if plugin has GitHub repo configured
    if (!plugin.githubRepoFullName) {
      return NextResponse.json(
        { error: "No GitHub repository linked to this plugin" },
        { status: 400 }
      );
    }

    // Check if plugin has installation ID
    if (!plugin.githubInstallationId) {
      return NextResponse.json(
        {
          error: "GitHub App not installed on repository. Please install the app first.",
          code: "APP_NOT_INSTALLED",
        },
        { status: 400 }
      );
    }

    // Parse owner and repo from full name
    const [owner, repo] = plugin.githubRepoFullName.split("/");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid GitHub repository format" },
        { status: 400 }
      );
    }

    // Get the latest release from GitHub
    const release = await getLatestRelease(plugin.githubInstallationId, owner, repo);

    if (!release) {
      return NextResponse.json(
        {
          error: "No releases found. Create a GitHub release first.",
          code: "NO_RELEASES",
        },
        { status: 404 }
      );
    }

    // Check if we already have a build for this release
    const existingBuild = await db.query.pluginBuilds.findFirst({
      where: eq(pluginBuilds.githubReleaseId, release.id),
    });

    if (existingBuild) {
      if (existingBuild.status === "building" || existingBuild.status === "pending") {
        return NextResponse.json({
          message: "Build already in progress",
          buildId: existingBuild.id,
          status: existingBuild.status,
        });
      }
      
      if (existingBuild.status === "success") {
        return NextResponse.json({
          message: "This release has already been built successfully",
          buildId: existingBuild.id,
          status: existingBuild.status,
        });
      }

      // Previous build failed - allow retry
      console.log(`Retrying failed build for release ${release.tagName}`);
    }

    // Parse version from tag
    const version = parseVersionFromTag(release.tagName);

    // Create a build record
    const [build] = await db
      .insert(pluginBuilds)
      .values({
        pluginId: plugin.id,
        version,
        status: "pending",
        githubReleaseId: release.id,
        githubReleaseTag: release.tagName,
        githubReleaseName: release.name,
        tarballUrl: release.tarballUrl,
      })
      .returning();

    console.log(`Created manual build record: ${build.id} for version ${version}`);

    // Trigger the build asynchronously
    triggerBuild(build.id, {
      pluginId: plugin.id,
      version,
      tarballUrl: release.tarballUrl,
      releaseTag: release.tagName,
      changelog: release.body ?? undefined,
      isPrerelease: release.prerelease,
      pluginPath: plugin.githubPluginPath ?? undefined,
      installationId: plugin.githubInstallationId,
    }).catch((error) => {
      console.error(`Build failed for ${plugin.id}@${version}:`, error);
    });

    return NextResponse.json({
      message: "Build triggered",
      buildId: build.id,
      pluginId: plugin.id,
      version,
      releaseTag: release.tagName,
    });
  } catch (error) {
    console.error("Error triggering build:", error);
    return NextResponse.json({ error: "Failed to trigger build" }, { status: 500 });
  }
}

