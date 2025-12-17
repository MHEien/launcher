#!/usr/bin/env bun
/**
 * Script to update the releases table in the database after a successful build.
 * Called by the CI/CD pipeline after artifacts are uploaded to GitHub Releases.
 *
 * Usage:
 *   bun run scripts/update-releases.ts --version "1.0.0" --channel "stable" --repo "owner/repo"
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { releases, releaseAssets } from "../packages/db/src/schema";
import { parseArgs } from "util";
import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  body: string;
  assets: ReleaseAsset[];
}

type Platform =
  | "windows"
  | "macos"
  | "macos_arm"
  | "linux"
  | "linux_appimage"
  | "linux_deb";

const PLATFORM_PATTERNS: Record<string, Platform> = {
  // Windows
  ".msi": "windows",
  "_x64-setup.exe": "windows",
  "_x64_en-US.msi": "windows",
  // macOS Intel
  "_x64.dmg": "macos",
  "_x64.app.tar.gz": "macos",
  // macOS ARM
  "_aarch64.dmg": "macos_arm",
  "_aarch64.app.tar.gz": "macos_arm",
  // Linux
  ".AppImage": "linux_appimage",
  ".AppImage.tar.gz": "linux_appimage",
  "_amd64.deb": "linux_deb",
};

function detectPlatform(fileName: string): Platform | null {
  for (const [pattern, platform] of Object.entries(PLATFORM_PATTERNS)) {
    if (fileName.includes(pattern) || fileName.endsWith(pattern)) {
      return platform;
    }
  }
  return null;
}

function isMainArtifact(fileName: string): boolean {
  // Main artifacts are the primary downloadable files (not signatures or update files)
  const mainExtensions = [".msi", ".exe", ".dmg", ".AppImage", ".deb"];
  const excludePatterns = [".sig", ".tar.gz.sig", "latest.json"];

  if (excludePatterns.some((p) => fileName.includes(p))) {
    return false;
  }

  // .tar.gz files are update bundles, not main artifacts
  if (fileName.endsWith(".tar.gz")) {
    return false;
  }

  return mainExtensions.some((ext) => fileName.endsWith(ext));
}

async function getGitHubRelease(
  repo: string,
  version: string
): Promise<GitHubRelease> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/releases/tags/v${version}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch release: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function computeChecksum(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file for checksum: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const hash = createHash("sha256");
  hash.update(Buffer.from(buffer));
  return hash.digest("hex");
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      version: { type: "string" },
      channel: { type: "string", default: "stable" },
      repo: { type: "string" },
    },
  });

  const { version, channel, repo } = values;

  if (!version || !repo) {
    console.error("Usage: bun run update-releases.ts --version <version> --repo <owner/repo> [--channel <channel>]");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log(`Updating releases for v${version} (${channel}) from ${repo}`);

  // Connect to database
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  // Fetch release from GitHub
  const ghRelease = await getGitHubRelease(repo, version);
  console.log(`Found GitHub release with ${ghRelease.assets.length} assets`);

  // Mark all previous releases as not latest for this channel
  await db
    .update(releases)
    .set({ isLatest: false })
    .where(
      and(
        eq(releases.isLatest, true),
        eq(releases.channel, channel as "stable" | "beta" | "alpha")
      )
    );

  // Process each asset
  const processedPlatforms = new Set<Platform>();

  for (const asset of ghRelease.assets) {
    const platform = detectPlatform(asset.name);

    if (!platform) {
      console.log(`Skipping unknown file type: ${asset.name}`);
      continue;
    }

    if (!isMainArtifact(asset.name)) {
      console.log(`Skipping non-main artifact: ${asset.name}`);
      continue;
    }

    // Skip if we already processed this platform (take first match)
    if (processedPlatforms.has(platform)) {
      console.log(`Skipping duplicate platform ${platform}: ${asset.name}`);
      continue;
    }

    console.log(`Processing ${asset.name} for platform ${platform}`);

    // Compute checksum (optional, can be slow for large files)
    let checksum: string | undefined;
    try {
      console.log(`  Computing checksum...`);
      checksum = await computeChecksum(asset.browser_download_url);
      console.log(`  Checksum: ${checksum.substring(0, 16)}...`);
    } catch (error) {
      console.warn(`  Warning: Could not compute checksum: ${error}`);
    }

    // Find signature file if exists
    const sigAsset = ghRelease.assets.find(
      (a) => a.name === `${asset.name}.sig`
    );
    let signature: string | undefined;
    if (sigAsset) {
      try {
        const sigResponse = await fetch(sigAsset.browser_download_url);
        signature = await sigResponse.text();
      } catch (error) {
        console.warn(`  Warning: Could not fetch signature: ${error}`);
      }
    }

    // Insert release record
    const [insertedRelease] = await db
      .insert(releases)
      .values({
        version,
        platform,
        channel: channel as "stable" | "beta" | "alpha",
        downloadUrl: asset.browser_download_url,
        fileName: asset.name,
        fileSize: asset.size,
        checksum,
        signature,
        releaseNotes: ghRelease.body,
        isLatest: true,
        isDeprecated: false,
        downloads: 0,
      })
      .returning();

    console.log(`  Inserted release record: ${insertedRelease.id}`);
    processedPlatforms.add(platform);

    // Add related assets (signatures, update bundles)
    const relatedAssets = ghRelease.assets.filter(
      (a) =>
        a.name.startsWith(asset.name.replace(/\.[^.]+$/, "")) &&
        a.name !== asset.name
    );

    for (const relatedAsset of relatedAssets) {
      await db.insert(releaseAssets).values({
        releaseId: insertedRelease.id,
        name: relatedAsset.name,
        downloadUrl: relatedAsset.browser_download_url,
        fileSize: relatedAsset.size,
        contentType: relatedAsset.content_type,
      });
      console.log(`  Added related asset: ${relatedAsset.name}`);
    }
  }

  console.log(`\nSuccessfully updated ${processedPlatforms.size} platform releases`);
  console.log(`Platforms: ${Array.from(processedPlatforms).join(", ")}`);
}

main().catch((error) => {
  console.error("Error updating releases:", error);
  process.exit(1);
});
