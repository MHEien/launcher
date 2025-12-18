import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

interface RepoContentsItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

interface MonorepoInfo {
  isMonorepo: boolean;
  type: "pnpm" | "npm" | "yarn" | "lerna" | "turbo" | "nx" | null;
  workspaces: string[];
  potentialPluginPaths: Array<{
    path: string;
    name: string;
    hasManifest: boolean;
  }>;
}

/**
 * GET /api/github/repos/[owner]/[repo]/analyze
 * Analyze a repository to detect monorepo structure and find potential plugin locations
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

    const searchParams = request.nextUrl.searchParams;
    const branch = searchParams.get("branch") || "main";

    // Fetch repository root contents
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!contentsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch repository contents" },
        { status: contentsResponse.status }
      );
    }

    const rootContents: RepoContentsItem[] = await contentsResponse.json();
    const rootFiles = rootContents.map((item) => item.name);

    // Detect monorepo type
    const monorepoInfo: MonorepoInfo = {
      isMonorepo: false,
      type: null,
      workspaces: [],
      potentialPluginPaths: [],
    };

    // Check for various monorepo indicators
    const hasPackageJson = rootFiles.includes("package.json");
    const hasPnpmWorkspace = rootFiles.includes("pnpm-workspace.yaml");
    const hasLernaJson = rootFiles.includes("lerna.json");
    const hasTurboJson = rootFiles.includes("turbo.json");
    const hasNxJson = rootFiles.includes("nx.json");

    // If it has a manifest.json in root, it might be a single plugin repo
    const hasRootManifest = rootFiles.includes("manifest.json");

    // Fetch and analyze package.json if it exists
    let packageJson: any = null;
    if (hasPackageJson) {
      const pkgResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (pkgResponse.ok) {
        const pkgData = await pkgResponse.json();
        packageJson = JSON.parse(
          Buffer.from(pkgData.content, "base64").toString("utf-8")
        );
      }
    }

    // Detect monorepo type and workspaces
    if (hasPnpmWorkspace) {
      monorepoInfo.isMonorepo = true;
      monorepoInfo.type = "pnpm";
      // Fetch pnpm-workspace.yaml
      const wsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/pnpm-workspace.yaml?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      if (wsResponse.ok) {
        const wsData = await wsResponse.json();
        const wsContent = Buffer.from(wsData.content, "base64").toString("utf-8");
        // Simple YAML parsing for packages array
        const packagesMatch = wsContent.match(/packages:\s*\n((?:\s*-\s*['"]?[\w/*-]+['"]?\s*\n?)+)/);
        if (packagesMatch) {
          const packages = packagesMatch[1]
            .split("\n")
            .map((line) => line.replace(/^\s*-\s*['"]?/, "").replace(/['"]?\s*$/, ""))
            .filter(Boolean);
          monorepoInfo.workspaces = packages;
        }
      }
    } else if (hasLernaJson) {
      monorepoInfo.isMonorepo = true;
      monorepoInfo.type = "lerna";
    } else if (hasNxJson) {
      monorepoInfo.isMonorepo = true;
      monorepoInfo.type = "nx";
    } else if (hasTurboJson && packageJson?.workspaces) {
      monorepoInfo.isMonorepo = true;
      monorepoInfo.type = "turbo";
      monorepoInfo.workspaces = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces
        : packageJson.workspaces?.packages || [];
    } else if (packageJson?.workspaces) {
      monorepoInfo.isMonorepo = true;
      monorepoInfo.type = packageJson.workspaces?.packages ? "yarn" : "npm";
      monorepoInfo.workspaces = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces
        : packageJson.workspaces?.packages || [];
    }

    // If it's a monorepo, search for potential plugin locations
    if (monorepoInfo.isMonorepo) {
      const searchPaths = new Set<string>();

      // Expand workspace patterns
      for (const pattern of monorepoInfo.workspaces) {
        // Handle patterns like "packages/*", "plugins/*", "apps/*"
        const basePath = pattern.replace(/\/\*$/, "").replace(/\*\*?/g, "");
        if (basePath) {
          searchPaths.add(basePath);
        }
      }

      // Also check common plugin directories
      const commonPluginDirs = ["plugins", "packages", "apps", "modules"];
      for (const dir of commonPluginDirs) {
        if (rootFiles.includes(dir)) {
          searchPaths.add(dir);
        }
      }

      // Search each path for plugin directories (containing manifest.json)
      for (const searchPath of searchPaths) {
        try {
          const dirResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${searchPath}?ref=${branch}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            }
          );

          if (dirResponse.ok) {
            const dirContents: RepoContentsItem[] = await dirResponse.json();
            
            // Check each subdirectory for manifest.json
            for (const item of dirContents) {
              if (item.type === "dir") {
                const subPath = `${searchPath}/${item.name}`;
                
                // Check if this directory has a manifest.json
                const manifestResponse = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/contents/${subPath}/manifest.json?ref=${branch}`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      Accept: "application/vnd.github+json",
                      "X-GitHub-Api-Version": "2022-11-28",
                    },
                  }
                );

                monorepoInfo.potentialPluginPaths.push({
                  path: subPath,
                  name: item.name,
                  hasManifest: manifestResponse.ok,
                });
              }
            }
          }
        } catch (e) {
          // Ignore errors for individual paths
        }
      }

      // Sort: paths with manifest first, then alphabetically
      monorepoInfo.potentialPluginPaths.sort((a, b) => {
        if (a.hasManifest && !b.hasManifest) return -1;
        if (!a.hasManifest && b.hasManifest) return 1;
        return a.path.localeCompare(b.path);
      });
    }

    // If not a monorepo but has manifest.json in root, add root path
    if (!monorepoInfo.isMonorepo && hasRootManifest) {
      monorepoInfo.potentialPluginPaths.push({
        path: "",
        name: repo,
        hasManifest: true,
      });
    }

    // If no manifest found anywhere, still allow selecting root
    if (monorepoInfo.potentialPluginPaths.length === 0) {
      monorepoInfo.potentialPluginPaths.push({
        path: "",
        name: "(repository root)",
        hasManifest: hasRootManifest,
      });
    }

    return NextResponse.json({
      owner,
      repo,
      branch,
      ...monorepoInfo,
    });
  } catch (error) {
    console.error("Error analyzing repository:", error);
    return NextResponse.json(
      { error: "Failed to analyze repository" },
      { status: 500 }
    );
  }
}

