import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { createDb, subscriptions } from "@launcher/db";
import { PRICING_TIERS } from "@/lib/pricing";

const db = createDb(process.env.DATABASE_URL!);

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const params = await searchParams;

  // Fetch user's subscription
  const userSubscription = await db.query.subscriptions.findFirst({
    where: (sub, { eq }) => eq(sub.userId, user.id),
  });

  const tier = userSubscription?.tier || "free";
  const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
  const isTrialing = userSubscription?.status === "trialing";
  const isPastDue = userSubscription?.status === "past_due";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/app/dashboard"
            className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold mb-2">Subscription</h2>
          <p className="text-zinc-400">Manage your subscription and billing</p>
        </div>

        {/* Success/Cancel Messages */}
        {params.success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6">
            🎉 Your subscription has been activated! Welcome to {tierConfig.name}.
          </div>
        )}
        {params.canceled && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg mb-6">
            Checkout was canceled. No changes were made to your subscription.
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Current Plan</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-violet-400">{tierConfig.name}</span>
                {isTrialing && (
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded">
                    Trial
                  </span>
                )}
                {isPastDue && (
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                    Past Due
                  </span>
                )}
              </div>
            </div>
            {tier !== "free" && (
              <Link
                href="/api/stripe/portal"
                className="text-sm text-zinc-400 hover:text-white"
              >
                Manage Billing →
              </Link>
            )}
          </div>

          {userSubscription?.currentPeriodEnd && (
            <p className="text-sm text-zinc-500">
              {userSubscription.cancelAtPeriodEnd
                ? `Your plan will be canceled on ${new Date(userSubscription.currentPeriodEnd).toLocaleDateString()}`
                : `Next billing date: ${new Date(userSubscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-medium text-zinc-400 mb-3">Plan Features</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tierConfig.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-green-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">AI Queries</span>
                <span>
                  0 / {tierConfig.limits.aiQueriesPerMonth === -1 ? "∞" : tierConfig.limits.aiQueriesPerMonth}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Installed Plugins</span>
                <span>
                  0 / {tierConfig.limits.maxPlugins === -1 ? "∞" : tierConfig.limits.maxPlugins}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {tier === "free" && (
          <div className="bg-linear-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Get 20x more AI queries, cloud sync, and priority support.
            </p>
            <Link
              href="/app/pricing"
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Plans
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Cancel Subscription */}
        {tier !== "free" && !userSubscription?.cancelAtPeriodEnd && (
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Cancel Subscription</h3>
            <p className="text-sm text-zinc-500 mb-4">
              You can cancel your subscription at any time. You&apos;ll keep access until the end of your billing period.
            </p>
            <Link
              href="/api/stripe/portal"
              className="text-sm text-red-400 hover:text-red-300"
            >
              Cancel subscription →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
