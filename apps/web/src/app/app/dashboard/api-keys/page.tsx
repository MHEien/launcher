import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { createDb, apiKeys } from "@launcher/db";
import { ApiKeyManager } from "./api-key-manager";

const db = createDb(process.env.DATABASE_URL!);

export default async function ApiKeysPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  // Fetch user's API keys
  const userApiKeys = await db.query.apiKeys.findMany({
    where: (key, { eq }) => eq(key.userId, user.id),
    orderBy: (key, { desc }) => [desc(key.createdAt)],
  });

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
          <h2 className="text-3xl font-bold mb-2">API Keys</h2>
          <p className="text-zinc-400">
            Manage API keys for syncing your desktop app with your account
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-2">How to use API keys</h3>
          <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
            <li>Create a new API key below</li>
            <li>Copy the key (it will only be shown once)</li>
            <li>In the Launcher desktop app, go to Settings → Account</li>
            <li>Paste your API key to enable cloud sync</li>
          </ol>
        </div>

        <ApiKeyManager initialKeys={userApiKeys} />
      </main>
    </div>
  );
}
