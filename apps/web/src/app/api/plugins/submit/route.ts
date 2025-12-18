import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { createDb, plugins } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://api.launcher.app/webhooks/github";
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

interface SubmitPluginBody {
  id: string;
  name: string;
  version: string;
  description: string;
  longDescription?: string;
  homepage?: string;
  repository?: string;
  categories?: string[];
  permissions?: string[];
  // GitHub integration
  githubRepoId?: number;
  githubRepoFullName?: string;
  githubDefaultBranch?: string;
  githubPluginPath?: string; // For monorepos, e.g., "packages/my-plugin"
}

async function createGitHubWebhook(
  accessToken: string,
  repoFullName: string
): Promise<{ webhookId: number } | { error: string }> {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn("GITHUB_WEBHOOK_SECRET not set, skipping webhook creation");
    return { error: "Webhook secret not configured" };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["release"],
          config: {
            url: WEBHOOK_URL,
            content_type: "json",
            secret: GITHUB_WEBHOOK_SECRET,
            insecure_ssl: "0",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GitHub webhook creation error:", errorData);
      
      // Check if webhook already exists
      if (response.status === 422 && errorData.errors?.some((e: any) => e.message?.includes("already exists"))) {
        // Webhook already exists, try to find it
        const listResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/hooks`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
        
        if (listResponse.ok) {
          const hooks = await listResponse.json();
          const existingHook = hooks.find((h: any) => h.config?.url === WEBHOOK_URL);
          if (existingHook) {
            return { webhookId: existingHook.id };
          }
        }
      }
      
      return { error: errorData.message || "Failed to create webhook" };
    }

    const webhook = await response.json();
    return { webhookId: webhook.id };
  } catch (error) {
    console.error("Error creating GitHub webhook:", error);
    return { error: "Failed to create webhook" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SubmitPluginBody = await request.json();
    const {
      id,
      name,
      version,
      description,
      longDescription,
      homepage,
      repository,
      categories,
      permissions,
      githubRepoId,
      githubRepoFullName,
      githubDefaultBranch,
      githubPluginPath,
    } = body;

    // Validation
    if (!id || !name || !version || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid plugin ID format" },
        { status: 400 }
      );
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format (use semver: x.y.z)" },
        { status: 400 }
      );
    }

    // GitHub repo is required
    if (!githubRepoId || !githubRepoFullName) {
      return NextResponse.json(
        { error: "GitHub repository is required" },
        { status: 400 }
      );
    }

    // Check if plugin ID already exists
    const existing = await db.query.plugins.findFirst({
      where: (p, { eq }) => eq(p.id, id),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A plugin with this ID already exists" },
        { status: 409 }
      );
    }

    // Create GitHub webhook
    let webhookId: number | null = null;
    
    // Get GitHub access token from connected account
    const githubAccount = await user.getConnectedAccount("github");

    if (githubAccount) {
      const tokenResult = await githubAccount.getAccessToken();
      const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.accessToken;
      if (accessToken) {
        const webhookResult = await createGitHubWebhook(accessToken, githubRepoFullName);
        if ("webhookId" in webhookResult) {
          webhookId = webhookResult.webhookId;
        } else {
          console.warn("Could not create webhook:", webhookResult.error);
          // Continue without webhook - can be retried later
        }
      }
    }

    // Insert the plugin
    await db.insert(plugins).values({
      id,
      name,
      authorId: user.id,
      authorName: user.displayName || user.primaryEmail || "Anonymous",
      description,
      longDescription: longDescription || null,
      homepage: homepage || null,
      repository: repository || null,
      categories: categories || [],
      tags: [], // Tags are separate from permissions
      downloads: 0,
      ratingCount: 0,
      verified: false,
      featured: false,
      status: "draft", // Will be published when first build succeeds
      currentVersion: version,
      // GitHub fields
      githubRepoId,
      githubRepoFullName,
      githubWebhookId: webhookId,
      githubDefaultBranch: githubDefaultBranch || "main",
      githubPluginPath: githubPluginPath || null, // For monorepos
      publishedAt: null,
    });

    return NextResponse.json({
      id,
      success: true,
      webhookCreated: webhookId !== null,
      message: webhookId
        ? "Plugin created. Create a GitHub release to publish your first version."
        : "Plugin created. Webhook could not be created - you may need to set up manual releases.",
    });
  } catch (error) {
    console.error("Plugin submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit plugin" },
      { status: 500 }
    );
  }
}
