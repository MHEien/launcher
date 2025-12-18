import { NextRequest, NextResponse } from "next/server";
import { getPlugin, updatePlugin, deletePlugin } from "@/lib/plugins/registry";
import type { CreatePluginInput } from "@/lib/plugins/types";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/plugins/:id - Get plugin details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const plugin = await getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json(plugin);
  } catch (error) {
    console.error("Error getting plugin:", error);
    return NextResponse.json({ error: "Failed to get plugin" }, { status: 500 });
  }
}

// PATCH /api/plugins/:id - Update plugin metadata
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as Partial<CreatePluginInput>;

    const success = await updatePlugin(id, user.id, body);
    if (!success) {
      return NextResponse.json({ error: "Plugin not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating plugin:", error);
    return NextResponse.json({ error: "Failed to update plugin" }, { status: 500 });
  }
}

// DELETE /api/plugins/:id - Delete plugin (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const success = await deletePlugin(id, user.id);

    if (!success) {
      return NextResponse.json({ error: "Plugin not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plugin:", error);
    return NextResponse.json({ error: "Failed to delete plugin" }, { status: 500 });
  }
}

