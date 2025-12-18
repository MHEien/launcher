import { NextRequest, NextResponse } from "next/server";
import { getPlugin, createVersion } from "@/lib/plugins/registry";
import type { CreateVersionInput } from "@/lib/plugins/types";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/plugins/:id/versions - Publish a new version
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: pluginId } = await params;

    // Verify ownership
    const plugin = await getPlugin(pluginId);
    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    if (plugin.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized to publish versions for this plugin" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const version = formData.get("version") as string;
    const changelog = formData.get("changelog") as string | null;
    const permissions = formData.get("permissions") as string | null;
    const aiToolSchemas = formData.get("aiToolSchemas") as string | null;
    const minLauncherVersion = formData.get("minLauncherVersion") as string | null;
    const isPrerelease = formData.get("isPrerelease") === "true";

    if (!file || !version) {
      return NextResponse.json({ error: "file and version are required" }, { status: 400 });
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
      return NextResponse.json({ error: "Invalid version format (use semver)" }, { status: 400 });
    }

    // Check for duplicate version
    if (plugin.versions.some((v) => v.version === version)) {
      return NextResponse.json({ error: "Version already exists" }, { status: 409 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const input: CreateVersionInput = {
      pluginId,
      version,
      fileBuffer,
      fileName: file.name || `${pluginId}-${version}.zip`,
      changelog: changelog || undefined,
      permissions: permissions ? JSON.parse(permissions) : undefined,
      aiToolSchemas: aiToolSchemas ? JSON.parse(aiToolSchemas) : undefined,
      minLauncherVersion: minLauncherVersion || undefined,
      isPrerelease,
    };

    const versionInfo = await createVersion(input);
    return NextResponse.json(versionInfo, { status: 201 });
  } catch (error) {
    console.error("Error publishing version:", error);
    return NextResponse.json({ error: "Failed to publish version" }, { status: 500 });
  }
}

