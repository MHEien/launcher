/**
 * GitHub App Installation Callback
 * 
 * Handles the callback after a user installs the GitHub App on their repository.
 * GitHub redirects here with installation_id and setup_action parameters.
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { createDb, plugins, eq } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const installationId = searchParams.get("installation_id");
    const setupAction = searchParams.get("setup_action"); // "install" | "update" | "request"
    const state = searchParams.get("state"); // Optional state we passed during redirect
    
    // Verify user is authenticated
    const user = await stackServerApp.getUser();
    if (!user) {
      // Redirect to sign in with return URL
      const returnUrl = encodeURIComponent(request.url);
      return NextResponse.redirect(
        new URL(`/handler/sign-in?after_auth_return_to=${returnUrl}`, request.url)
      );
    }

    if (!installationId) {
      return NextResponse.redirect(
        new URL("/app/dashboard/plugins?error=missing_installation_id", request.url)
      );
    }

    // If state contains a plugin ID, update that plugin with the installation ID
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        if (stateData.pluginId) {
          // Verify user owns the plugin
          const plugin = await db.query.plugins.findFirst({
            where: eq(plugins.id, stateData.pluginId),
          });

          if (plugin && plugin.authorId === user.id) {
            await db
              .update(plugins)
              .set({
                githubInstallationId: parseInt(installationId, 10),
                updatedAt: new Date(),
              })
              .where(eq(plugins.id, stateData.pluginId));
            
            return NextResponse.redirect(
              new URL(`/app/dashboard/plugins?success=app_installed&plugin=${stateData.pluginId}`, request.url)
            );
          }
        }
      } catch {
        // State parsing failed, continue without it
      }
    }

    // Generic success - app was installed but we don't know which plugin to associate
    return NextResponse.redirect(
      new URL(`/app/dashboard/plugins?success=app_installed&installation_id=${installationId}`, request.url)
    );
  } catch (error) {
    console.error("GitHub App callback error:", error);
    return NextResponse.redirect(
      new URL("/app/dashboard/plugins?error=callback_failed", request.url)
    );
  }
}


