import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Calendar, GitCommit, Sparkles, Zap, Bug, Plus } from "lucide-react";

const releases = [
  {
    version: "1.0.0",
    date: "December 15, 2024",
    type: "major",
    changes: [
      { type: "feature", text: "Initial public release with full launcher functionality" },
      { type: "feature", text: "WASM plugin system with marketplace integration" },
      { type: "feature", text: "AI-powered chat and Codex CLI integration" },
      { type: "feature", text: "Customizable dashboard with drag-and-drop widgets" },
      { type: "feature", text: "OAuth integrations: GitHub, Google, Notion, Slack" },
      { type: "feature", text: "File indexing with Tantivy (~40k files)" },
      { type: "feature", text: "Cross-platform support (Windows, macOS, Linux)" },
    ],
  },
  {
    version: "0.9.0",
    date: "December 1, 2024",
    type: "minor",
    changes: [
      { type: "feature", text: "Added terminal widget for dashboard" },
      { type: "feature", text: "Implemented cloud sync for Pro users" },
      { type: "feature", text: "Added subscription tiers (Free, Pro, Team, Enterprise)" },
      { type: "improvement", text: "Improved search performance by 40%" },
      { type: "fix", text: "Fixed memory leak in file indexer" },
    ],
  },
  {
    version: "0.8.5",
    date: "November 20, 2024",
    type: "patch",
    changes: [
      { type: "feature", text: "Added Google Calendar and Google Drive providers" },
      { type: "improvement", text: "Enhanced plugin security with sandboxing" },
      { type: "fix", text: "Fixed OAuth callback handling on Linux" },
      { type: "fix", text: "Resolved widget positioning issues" },
    ],
  },
  {
    version: "0.8.0",
    date: "November 10, 2024",
    type: "minor",
    changes: [
      { type: "feature", text: "Introduced customizable global hotkeys" },
      { type: "feature", text: "Added plugin widget system" },
      { type: "feature", text: "Implemented frecency-based app suggestions" },
      { type: "improvement", text: "Redesigned settings UI" },
      { type: "fix", text: "Fixed plugin installation on Windows" },
    ],
  },
];

const typeColors = {
  feature: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  improvement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  fix: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const typeIcons = {
  feature: Plus,
  improvement: Zap,
  fix: Bug,
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
            <GitCommit className="w-4 h-4" />
            Product Updates
          </div>
          <h1 className="text-5xl font-bold mb-4">Changelog</h1>
          <p className="text-xl text-zinc-400">
            Stay up to date with the latest features, improvements, and bug fixes.
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-12">
          {releases.map((release, index) => (
            <div key={release.version} className="relative">
              {/* Timeline line */}
              {index !== releases.length - 1 && (
                <div className="absolute left-6 top-16 bottom-0 w-px bg-zinc-800" />
              )}
              
              <div className="flex gap-6">
                {/* Version badge */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    release.type === "major" 
                      ? "bg-linear-to-br from-violet-500 to-fuchsia-500" 
                      : release.type === "minor"
                      ? "bg-linear-to-br from-blue-500 to-cyan-500"
                      : "bg-zinc-800"
                  }`}>
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">v{release.version}</h2>
                    {release.type === "major" && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        Major Release
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                    <Calendar className="w-4 h-4" />
                    {release.date}
                  </div>

                  <ul className="space-y-3">
                    {release.changes.map((change, i) => {
                      const Icon = typeIcons[change.type as keyof typeof typeIcons];
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${typeColors[change.type as keyof typeof typeColors]} flex items-center gap-1 mt-0.5`}>
                            <Icon className="w-3 h-3" />
                            {change.type}
                          </span>
                          <span className="text-zinc-300 flex-1">{change.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subscribe CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-xl font-bold mb-2">Stay updated</h3>
          <p className="text-zinc-400 mb-4">
            Subscribe to our newsletter to get notified about new releases and features.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
            />
            <button className="px-6 py-2 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
