import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getMonthlyUsage } from "@/lib/usage";
import { createDb } from "@launcher/db";
import { PRICING_TIERS } from "@/lib/pricing";

const db = createDb(process.env.DATABASE_URL!);

export default async function DashboardPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  // Fetch user data in parallel
  const [usage, subscription, installedPlugins] = await Promise.all([
    getMonthlyUsage(user.id),
    db.query.subscriptions.findFirst({
      where: (sub, { eq }) => eq(sub.userId, user.id),
    }),
    db.query.userPlugins.findMany({
      where: (up, { eq }) => eq(up.userId, user.id),
    }),
  ]);

  const tier = subscription?.tier || "free";
  const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
  const aiQueryLimit = tierConfig.limits.aiQueriesPerMonth;
  const pluginLimit = tierConfig.limits.maxPlugins;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-zinc-400">
            Welcome back, {user?.displayName || user?.primaryEmail || "User"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Usage Stats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-1">AI Queries</h3>
            <p className="text-3xl font-bold">
              {usage.aiQueries} / {aiQueryLimit === -1 ? "∞" : aiQueryLimit}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{tierConfig.name} tier limit</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Installed Plugins</h3>
            <p className="text-3xl font-bold">
              {installedPlugins.length}{pluginLimit !== -1 ? ` / ${pluginLimit}` : ""}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {pluginLimit === -1 ? "Unlimited" : `${pluginLimit} max on ${tierConfig.name} tier`}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Subscription</h3>
            <p className="text-3xl font-bold">{tierConfig.name}</p>
            {tier === "free" ? (
              <Link href="/app/pricing" className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block">
                Upgrade →
              </Link>
            ) : (
              <Link href="/app/dashboard/subscription" className="text-xs text-zinc-500 hover:text-zinc-400 mt-1 inline-block">
                Manage →
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/app"
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="text-xl">🔌</span>
                <div>
                  <p className="font-medium">Browse Plugins</p>
                  <p className="text-sm text-zinc-500">Discover new plugins</p>
                </div>
              </Link>
              <Link
                href="/app/account/settings"
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="font-medium">Account Settings</p>
                  <p className="text-sm text-zinc-500">Manage your profile</p>
                </div>
              </Link>
              <Link
                href="/app/dashboard/api-keys"
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="text-xl">🔑</span>
                <div>
                  <p className="font-medium">API Keys</p>
                  <p className="text-sm text-zinc-500">Sync with desktop app</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="text-center py-8 text-zinc-500">
              <p>No recent activity</p>
              <p className="text-sm mt-1">Your plugin installs and searches will appear here</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
