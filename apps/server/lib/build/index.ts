/**
 * Plugin Build Service
 * 
 * Downloads source from GitHub releases, builds TypeScript plugins to WASM,
 * uploads artifacts to Vercel Blob, and creates plugin versions.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile, rm, readdir, stat } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { createHash } from "crypto";
import { Readable } from "stream";
import * as tar from "tar";
import { getDb, pluginBuilds, pluginVersions, plugins, eq, and } from "@/lib/db";
import { uploadPluginFile } from "@/lib/plugins/storage";

const execAsync = promisify(exec);

const BUILD_DIR = process.env.BUILD_DIR || "/tmp/plugin-builds";

interface BuildOptions {
  pluginId: string;
  version: string;
  tarballUrl: string;
  releaseTag: string;
  changelog?: string;
  isPrerelease: boolean;
  pluginPath?: string; // For monorepos, e.g., "packages/my-plugin"
  installationId?: number; // GitHub App installation ID for authenticated downloads
}

interface BuildResult {
  success: boolean;
  wasmUrl?: string;
  checksum?: string;
  fileSize?: number;
  error?: string;
  logs: string[];
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "Launcher-Build-Service/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const fileStream = createWriteStream(destPath);
  // @ts-expect-error - Node.js fetch returns a Web ReadableStream
  await pipeline(Readable.fromWeb(response.body), fileStream);
}

/**
 * Extract tarball
 */
async function extractTarball(tarballPath: string, destDir: string): Promise<string> {
  await mkdir(destDir, { recursive: true });
  
  await tar.extract({
    file: tarballPath,
    cwd: destDir,
  });

  // GitHub tarballs extract to a directory like "owner-repo-hash"
  const entries = await readdir(destDir);
  const extractedDir = entries.find(async (entry) => {
    const entryPath = join(destDir, entry);
    const stats = await stat(entryPath);
    return stats.isDirectory();
  });

  if (!extractedDir) {
    throw new Error("No directory found in extracted tarball");
  }

  return join(destDir, extractedDir);
}

/**
 * Find the plugin source directory
 * Looks for manifest.json to identify the plugin root
 * 
 * @param baseDir - The extracted repository root
 * @param pluginPath - Optional path within the repo for monorepos
 */
async function findPluginRoot(baseDir: string, pluginPath?: string): Promise<string> {
  // If a specific plugin path is provided (monorepo), use it
  if (pluginPath) {
    const specificPath = join(baseDir, pluginPath);
    const manifestPath = join(specificPath, "manifest.json");
    if (existsSync(manifestPath)) {
      return specificPath;
    }
    throw new Error(`Could not find manifest.json at specified path: ${pluginPath}`);
  }

  // Check if manifest.json exists in the root
  const manifestPath = join(baseDir, "manifest.json");
  if (existsSync(manifestPath)) {
    return baseDir;
  }

  // Look in common subdirectories
  const subdirs = ["plugin", "src", "packages/plugin"];
  for (const subdir of subdirs) {
    const path = join(baseDir, subdir, "manifest.json");
    if (existsSync(path)) {
      return join(baseDir, subdir);
    }
  }

  throw new Error("Could not find manifest.json in repository");
}

/**
 * Detect plugin type from source files
 */
async function detectPluginType(pluginDir: string): Promise<"typescript" | "rust" | "unknown"> {
  const files = await readdir(pluginDir);
  
  // Check for TypeScript
  if (files.includes("package.json") || files.some(f => f.endsWith(".ts"))) {
    return "typescript";
  }
  
  // Check for Rust
  if (files.includes("Cargo.toml")) {
    return "rust";
  }
  
  return "unknown";
}

/**
 * Build TypeScript plugin using extism-js
 */
async function buildTypeScriptPlugin(pluginDir: string, logs: string[]): Promise<string> {
  logs.push("Building TypeScript plugin...");
  
  // Find entry point
  let entryPoint = "src/index.ts";
  const packageJsonPath = join(pluginDir, "package.json");
  
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    // Check for custom entry in package.json scripts
    if (packageJson.scripts?.build) {
      const buildMatch = packageJson.scripts.build.match(/extism-js\s+(\S+\.ts)/);
      if (buildMatch) {
        entryPoint = buildMatch[1];
      }
    }
  }
  
  const entryPath = join(pluginDir, entryPoint);
  if (!existsSync(entryPath)) {
    // Try alternative entry points
    const alternatives = ["src/index.ts", "index.ts", "src/main.ts", "main.ts"];
    const found = alternatives.find(alt => existsSync(join(pluginDir, alt)));
    if (found) {
      entryPoint = found;
    } else {
      throw new Error(`Entry point not found. Tried: ${entryPoint}, ${alternatives.join(", ")}`);
    }
  }

  logs.push(`Entry point: ${entryPoint}`);
  
  const outputPath = join(pluginDir, "plugin.wasm");
  
  // Install dependencies if package.json exists
  if (existsSync(packageJsonPath)) {
    logs.push("Installing dependencies...");
    try {
      const { stdout, stderr } = await execAsync("bun install --frozen-lockfile", {
        cwd: pluginDir,
        timeout: 120000, // 2 minute timeout
      });
      if (stdout) logs.push(stdout);
      if (stderr) logs.push(`[stderr] ${stderr}`);
    } catch {
      // Try without frozen lockfile
      logs.push("Retrying without frozen lockfile...");
      const { stdout, stderr } = await execAsync("bun install", {
        cwd: pluginDir,
        timeout: 120000,
      });
      if (stdout) logs.push(stdout);
      if (stderr) logs.push(`[stderr] ${stderr}`);
    }
  }
  
  // Build with extism-js
  logs.push("Compiling to WASM...");
  const { stdout, stderr } = await execAsync(
    `extism-js ${entryPoint} -o plugin.wasm`,
    {
      cwd: pluginDir,
      timeout: 300000, // 5 minute timeout for build
    }
  );
  
  if (stdout) logs.push(stdout);
  if (stderr) logs.push(`[stderr] ${stderr}`);
  
  if (!existsSync(outputPath)) {
    throw new Error("Build completed but plugin.wasm not found");
  }
  
  logs.push("Build successful!");
  return outputPath;
}

/**
 * Build Rust plugin (placeholder - implement later)
 */
async function buildRustPlugin(pluginDir: string, logs: string[]): Promise<string> {
  logs.push("Rust plugin builds not yet supported");
  throw new Error("Rust plugin builds not yet supported. Please build locally and upload the WASM file.");
}

/**
 * Calculate SHA256 checksum of a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Main build function
 */
export async function triggerBuild(buildId: string, options: BuildOptions): Promise<BuildResult> {
  const db = getDb();
  const logs: string[] = [];
  const workDir = join(BUILD_DIR, buildId);

  try {
    // Update build status to building
    await db
      .update(pluginBuilds)
      .set({
        status: "building",
        startedAt: new Date(),
      })
      .where(eq(pluginBuilds.id, buildId));

    logs.push(`Starting build for ${options.pluginId}@${options.version}`);
    logs.push(`Release tag: ${options.releaseTag}`);
    if (options.pluginPath) {
      logs.push(`Plugin path (monorepo): ${options.pluginPath}`);
    }

    // Create work directory
    await mkdir(workDir, { recursive: true });
    logs.push(`Work directory: ${workDir}`);

    // Download tarball
    const tarballPath = join(workDir, "source.tar.gz");
    logs.push(`Downloading source from: ${options.tarballUrl}`);
    await downloadFile(options.tarballUrl, tarballPath);
    logs.push("Download complete");

    // Extract tarball
    logs.push("Extracting source...");
    const extractDir = join(workDir, "extracted");
    const sourceDir = await extractTarball(tarballPath, extractDir);
    logs.push(`Extracted to: ${sourceDir}`);

    // Find plugin root (for monorepos, use the specified path)
    const pluginDir = await findPluginRoot(sourceDir, options.pluginPath);
    logs.push(`Plugin root: ${pluginDir}`);

    // Read manifest
    const manifestPath = join(pluginDir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
    logs.push(`Manifest loaded: ${manifest.name} v${manifest.version}`);

    // Detect plugin type
    const pluginType = await detectPluginType(pluginDir);
    logs.push(`Plugin type: ${pluginType}`);

    // Build based on type
    let wasmPath: string;
    if (pluginType === "typescript") {
      wasmPath = await buildTypeScriptPlugin(pluginDir, logs);
    } else if (pluginType === "rust") {
      wasmPath = await buildRustPlugin(pluginDir, logs);
    } else {
      throw new Error(`Unsupported plugin type: ${pluginType}`);
    }

    // Calculate checksum and file size
    const checksum = await calculateChecksum(wasmPath);
    const wasmContent = await readFile(wasmPath);
    const fileSize = wasmContent.length;
    logs.push(`WASM size: ${(fileSize / 1024).toFixed(2)} KB`);
    logs.push(`Checksum: ${checksum}`);

    // Upload to Vercel Blob
    logs.push("Uploading to storage...");
    const uploadResult = await uploadPluginFile(
      options.pluginId,
      options.version,
      wasmContent,
      "plugin.wasm"
    );
    logs.push(`Uploaded: ${uploadResult.url}`);

    // Mark any existing latest version as not latest
    await db
      .update(pluginVersions)
      .set({ isLatest: false })
      .where(
        and(
          eq(pluginVersions.pluginId, options.pluginId),
          eq(pluginVersions.isLatest, true)
        )
      );

    // Create plugin version record
    const [version] = await db
      .insert(pluginVersions)
      .values({
        pluginId: options.pluginId,
        version: options.version,
        downloadUrl: uploadResult.url,
        checksum,
        fileSize,
        permissions: manifest.permissions || [],
        aiToolSchemas: manifest.ai_tool_schemas || {},
        minLauncherVersion: manifest.min_launcher_version,
        changelog: options.changelog,
        isLatest: !options.isPrerelease,
        isPrerelease: options.isPrerelease,
        publishedAt: new Date(),
      })
      .returning();

    logs.push(`Version created: ${version.id}`);

    // Update plugin to published status and current version
    await db
      .update(plugins)
      .set({
        status: "published",
        currentVersion: options.isPrerelease ? undefined : options.version,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plugins.id, options.pluginId));

    // Update build record with success
    await db
      .update(pluginBuilds)
      .set({
        status: "success",
        versionId: version.id,
        logs: logs.join("\n"),
        completedAt: new Date(),
      })
      .where(eq(pluginBuilds.id, buildId));

    logs.push("Build completed successfully!");

    return {
      success: true,
      wasmUrl: uploadResult.url,
      checksum,
      fileSize,
      logs,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logs.push(`ERROR: ${errorMessage}`);
    
    console.error(`Build failed for ${options.pluginId}@${options.version}:`, error);

    // Update build record with failure
    await db
      .update(pluginBuilds)
      .set({
        status: "failed",
        logs: logs.join("\n"),
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(pluginBuilds.id, buildId));

    return {
      success: false,
      error: errorMessage,
      logs,
    };
  } finally {
    // Cleanup work directory
    try {
      await rm(workDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get build status
 */
export async function getBuildStatus(buildId: string) {
  const db = getDb();
  return db.query.pluginBuilds.findFirst({
    where: eq(pluginBuilds.id, buildId),
  });
}

/**
 * Get builds for a plugin
 */
export async function getPluginBuilds(pluginId: string, limit = 10) {
  const db = getDb();
  return db.query.pluginBuilds.findMany({
    where: eq(pluginBuilds.pluginId, pluginId),
    orderBy: (builds, { desc }) => [desc(builds.createdAt)],
    limit,
  });
}

