import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { createDb, plugins, pluginBuilds, eq, desc } from "@launcher/db";
import {
  Package,
  GitBranch,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TriggerBuildButton, InstallationStatus } from "@/components/plugin-actions";

const db = createDb(process.env.DATABASE_URL!);

interface PluginWithBuilds {
  id: string;
  name: string;
  description: string | null;
  status: string;
  currentVersion: string | null;
  downloads: number;
  githubRepoFullName: string | null;
  githubInstallationId: number | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  builds: {
    id: string;
    version: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
  }[];
}

async function getUserPlugins(userId: string): Promise<PluginWithBuilds[]> {
  const userPlugins = await db.query.plugins.findMany({
    where: eq(plugins.authorId, userId),
    orderBy: [desc(plugins.updatedAt)],
  });

  // Get recent builds for each plugin
  const pluginsWithBuilds: PluginWithBuilds[] = await Promise.all(
    userPlugins.map(async (plugin) => {
      const builds = await db.query.pluginBuilds.findMany({
        where: eq(pluginBuilds.pluginId, plugin.id),
        orderBy: [desc(pluginBuilds.createdAt)],
        limit: 5,
      });

      return {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        status: plugin.status,
        currentVersion: plugin.currentVersion,
        downloads: plugin.downloads,
        githubRepoFullName: plugin.githubRepoFullName,
        githubInstallationId: plugin.githubInstallationId,
        createdAt: plugin.createdAt,
        updatedAt: plugin.updatedAt,
        publishedAt: plugin.publishedAt,
        builds: builds.map((b) => ({
          id: b.id,
          version: b.version,
          status: b.status,
          createdAt: b.createdAt,
          completedAt: b.completedAt,
          errorMessage: b.errorMessage,
        })),
      };
    })
  );

  return pluginsWithBuilds;
}

function BuildStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Success
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case "building":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Building
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    default:
      return null;
  }
}

function PluginStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "published":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
          Published
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
          Draft
        </span>
      );
    case "pending_review":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
          Pending Review
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
          {status}
        </span>
      );
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export default async function PluginDashboardPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in?after_auth_return_to=/app/dashboard/plugins");
  }

  const userPlugins = await getUserPlugins(user.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">My Plugins</h1>
            <p className="text-zinc-400">
              Manage your published plugins and view build status
            </p>
          </div>
          <Link
            href="/app/plugins/submit"
            className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plugin
          </Link>
        </div>

        {/* Empty state */}
        {userPlugins.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">No plugins yet</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Create your first plugin by connecting a GitHub repository. We&apos;ll
              automatically build and publish new versions when you create a
              release.
            </p>
            <Link
              href="/app/plugins/submit"
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Plugin
            </Link>
          </div>
        )}

        {/* Plugin list */}
        <div className="space-y-4">
          {userPlugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Plugin header */}
              <div className="p-5 border-b border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/app/plugins/${plugin.id}`}
                          className="font-semibold text-lg hover:text-violet-400 transition-colors"
                        >
                          {plugin.name}
                        </Link>
                        <PluginStatusBadge status={plugin.status} />
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">
                        {plugin.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {plugin.currentVersion && (
                          <span>v{plugin.currentVersion}</span>
                        )}
                        <span>{plugin.downloads.toLocaleString()} downloads</span>
                        {plugin.githubRepoFullName && (
                          <a
                            href={`https://github.com/${plugin.githubRepoFullName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-zinc-300"
                          >
                            <GitBranch className="w-3 h-3" />
                            {plugin.githubRepoFullName}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <InstallationStatus
                      hasInstallation={!!plugin.githubInstallationId}
                      githubRepoFullName={plugin.githubRepoFullName}
                    />
                    <Link
                      href={`/app/plugins/${plugin.id}`}
                      className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>

              {/* Actions bar */}
              {plugin.githubRepoFullName && (
                <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    {plugin.builds.length > 0
                      ? `Last build: ${formatRelativeTime(plugin.builds[0].createdAt)}`
                      : "No builds yet"}
                  </div>
                  <TriggerBuildButton
                    pluginId={plugin.id}
                    hasGithubApp={!!plugin.githubInstallationId}
                    githubRepoFullName={plugin.githubRepoFullName}
                  />
                </div>
              )}

              {/* Recent builds */}
              {plugin.builds.length > 0 && (
                <div className="p-4 bg-zinc-900/50">
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Recent Builds
                  </h3>
                  <div className="space-y-2">
                    {plugin.builds.map((build) => (
                      <div
                        key={build.id}
                        className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <BuildStatusBadge status={build.status} />
                          <span className="text-sm font-mono">
                            v{build.version}
                          </span>
                          {build.errorMessage && build.status === "failed" && (
                            <span
                              className="text-xs text-red-400 truncate max-w-xs"
                              title={build.errorMessage}
                            >
                              {build.errorMessage}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {formatRelativeTime(build.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No builds yet */}
              {plugin.builds.length === 0 && plugin.githubRepoFullName && (
                <div className="p-4 bg-zinc-900/50">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>
                      {!plugin.githubInstallationId ? (
                        <>
                          Install the GitHub App first, then create a release or use the &quot;Trigger Build&quot; button.
                        </>
                      ) : (
                        <>
                          No builds yet. Create a{" "}
                          <a
                            href={`https://github.com/${plugin.githubRepoFullName}/releases/new`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline"
                          >
                            GitHub release
                          </a>{" "}
                          or click &quot;Trigger Build&quot; to build from the latest release.
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/app/dashboard"
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

