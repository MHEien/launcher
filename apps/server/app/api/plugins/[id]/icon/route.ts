import { NextRequest, NextResponse } from "next/server";
import { getPlugin, updatePlugin } from "@/lib/plugins/registry";
import { uploadPluginIcon } from "@/lib/plugins/storage";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/plugins/:id/icon - Upload plugin icon
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
    if (!plugin || plugin.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const iconUrl = await uploadPluginIcon(pluginId, fileBuffer, file.type);

    // Update plugin
    await updatePlugin(pluginId, user.id, { iconUrl } as Parameters<typeof updatePlugin>[2]);

    return NextResponse.json({ iconUrl });
  } catch (error) {
    console.error("Error uploading icon:", error);
    return NextResponse.json({ error: "Failed to upload icon" }, { status: 500 });
  }
}

