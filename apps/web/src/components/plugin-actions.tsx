"use client";

import { useState } from "react";
import { Loader2, Play, Download, AlertTriangle } from "lucide-react";

interface TriggerBuildButtonProps {
  pluginId: string;
  hasGithubApp: boolean;
  githubRepoFullName: string | null;
}

export function TriggerBuildButton({
  pluginId,
  hasGithubApp,
  githubRepoFullName,
}: TriggerBuildButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTriggerBuild = async () => {
    setIsTriggering(true);
    setResult(null);

    try {
      const response = await fetch(`/api/plugins/${pluginId}/builds`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Build triggered for v${data.version}`,
        });
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to trigger build",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  // If no GitHub App installed, show install prompt
  if (!hasGithubApp && githubRepoFullName) {
    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "launcher-plugin-builder";
    const [owner, repo] = githubRepoFullName.split("/");
    
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          <span>GitHub App not installed</span>
        </div>
        <a
          href={`https://github.com/apps/${appSlug}/installations/new/permissions?target_id=${owner}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="w-3 h-3" />
          Install GitHub App
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleTriggerBuild}
        disabled={isTriggering || !hasGithubApp}
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
      >
        {isTriggering ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Triggering...
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Trigger Build
          </>
        )}
      </button>
      
      {result && (
        <span
          className={`text-xs ${
            result.success ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}

interface InstallationStatusProps {
  hasInstallation: boolean;
  githubRepoFullName: string | null;
}

export function InstallationStatus({
  hasInstallation,
  githubRepoFullName,
}: InstallationStatusProps) {
  if (!githubRepoFullName) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
        No GitHub repo
      </span>
    );
  }

  if (hasInstallation) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
        App Installed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
      <AlertTriangle className="w-3 h-3" />
      App Not Installed
    </span>
  );
}

