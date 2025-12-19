/**
 * Plugin Versions API
 * 
 * GET - List all versions for a plugin
 * POST - Upload a new version (direct WASM upload)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, plugins, pluginVersions, eq, and, desc } from "@/lib/db";
import { uploadPluginFile } from "@/lib/plugins/storage";
import { getAuthUserWithName } from "@/lib/auth";
import { createHash } from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/plugins/:id/versions - List all versions
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: pluginId } = await params;
    const db = getDb();

    const versions = await db.query.pluginVersions.findMany({
      where: eq(pluginVersions.pluginId, pluginId),
      orderBy: [desc(pluginVersions.publishedAt)],
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        downloadUrl: v.downloadUrl,
        checksum: v.checksum,
        fileSize: v.fileSize,
        permissions: v.permissions,
        changelog: v.changelog,
        downloads: v.downloads,
        isLatest: v.isLatest,
        isPrerelease: v.isPrerelease,
        publishedAt: v.publishedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error getting plugin versions:", error);
    return NextResponse.json({ error: "Failed to get versions" }, { status: 500 });
  }
}

// POST /api/plugins/:id/versions - Upload a new version directly
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
      return NextResponse.json({ error: "Not authorized to upload versions for this plugin" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const wasmFile = formData.get("wasm") as File | null;
    const version = formData.get("version") as string | null;
    const changelog = formData.get("changelog") as string | null;
    const isPrerelease = formData.get("prerelease") === "true";
    const permissionsJson = formData.get("permissions") as string | null;

    // Validate required fields
    if (!wasmFile) {
      return NextResponse.json(
        { error: "WASM file is required" },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: "Version is required" },
        { status: 400 }
      );
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format. Use semver (e.g., 1.0.0 or 1.0.0-beta.1)" },
        { status: 400 }
      );
    }

    // Check if version already exists
    const existingVersion = await db.query.pluginVersions.findFirst({
      where: and(
        eq(pluginVersions.pluginId, pluginId),
        eq(pluginVersions.version, version)
      ),
    });

    if (existingVersion) {
      return NextResponse.json(
        { error: "Version already exists" },
        { status: 409 }
      );
    }

    // Read the WASM file
    const wasmBuffer = Buffer.from(await wasmFile.arrayBuffer());

    // Validate it's a valid WASM file (magic bytes)
    const wasmMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // \0asm
    if (!wasmBuffer.slice(0, 4).equals(wasmMagic)) {
      return NextResponse.json(
        { error: "Invalid WASM file. File does not have valid WebAssembly magic bytes." },
        { status: 400 }
      );
    }

    // Calculate checksum
    const checksum = createHash("sha256").update(wasmBuffer).digest("hex");

    // Parse permissions if provided
    let permissions: string[] = [];
    if (permissionsJson) {
      try {
        permissions = JSON.parse(permissionsJson);
        if (!Array.isArray(permissions)) {
          permissions = [];
        }
      } catch {
        // Ignore parse errors, use empty array
      }
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadPluginFile(
      pluginId,
      version,
      wasmBuffer,
      "plugin.wasm"
    );

    // Mark existing latest version as not latest
    if (!isPrerelease) {
      await db
        .update(pluginVersions)
        .set({ isLatest: false })
        .where(
          and(
            eq(pluginVersions.pluginId, pluginId),
            eq(pluginVersions.isLatest, true)
          )
        );
    }

    // Create version record
    const [newVersion] = await db
      .insert(pluginVersions)
      .values({
        pluginId,
        version,
        downloadUrl: uploadResult.url,
        checksum,
        fileSize: wasmBuffer.length,
        permissions,
        changelog: changelog || null,
        isLatest: !isPrerelease,
        isPrerelease,
        publishedAt: new Date(),
      })
      .returning();

    // Update plugin to published status if not prerelease
    if (!isPrerelease) {
      await db
        .update(plugins)
        .set({
          status: "published",
          currentVersion: version,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(plugins.id, pluginId));
    }

    return NextResponse.json({
      message: "Version uploaded successfully",
      version: {
        id: newVersion.id,
        version: newVersion.version,
        downloadUrl: newVersion.downloadUrl,
        checksum: newVersion.checksum,
        fileSize: newVersion.fileSize,
        isLatest: newVersion.isLatest,
        isPrerelease: newVersion.isPrerelease,
        publishedAt: newVersion.publishedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading version:", error);
    return NextResponse.json({ error: "Failed to upload version" }, { status: 500 });
  }
}
