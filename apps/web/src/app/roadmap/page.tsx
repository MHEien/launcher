import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { CheckCircle2, Circle, Clock, Sparkles, Users, Vote } from "lucide-react";

const roadmapItems = [
  {
    status: "completed",
    quarter: "Q4 2024",
    items: [
      { title: "WASM Plugin System", description: "Secure plugin architecture with marketplace" },
      { title: "AI Integration", description: "Built-in AI chat and Codex CLI support" },
      { title: "Dashboard Widgets", description: "Customizable drag-and-drop widgets" },
      { title: "OAuth Integrations", description: "GitHub, Google, Notion, Slack" },
      { title: "Cloud Sync", description: "Cross-device synchronization for Pro users" },
    ],
  },
  {
    status: "in-progress",
    quarter: "Q1 2025",
    items: [
      { title: "Mobile Companion App", description: "iOS and Android apps for remote control", votes: 342 },
      { title: "Team Workspaces", description: "Shared configurations and plugins for teams", votes: 218 },
      { title: "Advanced Theming", description: "Custom themes and color schemes", votes: 156 },
      { title: "Plugin Analytics", description: "Usage insights for plugin developers", votes: 89 },
    ],
  },
  {
    status: "planned",
    quarter: "Q2 2025",
    items: [
      { title: "Browser Extension", description: "Quick launcher access from any webpage", votes: 445 },
      { title: "Workflow Automation", description: "Create custom automation workflows", votes: 312 },
      { title: "Voice Commands", description: "Control launcher with voice input", votes: 267 },
      { title: "Plugin Marketplace v2", description: "Enhanced discovery and recommendations", votes: 198 },
      { title: "API Webhooks", description: "Trigger actions from external services", votes: 134 },
    ],
  },
  {
    status: "planned",
    quarter: "Q3 2025",
    items: [
      { title: "AI Workflow Builder", description: "Visual workflow builder with AI assistance", votes: 523 },
      { title: "Multi-Monitor Support", description: "Enhanced support for multiple displays", votes: 289 },
      { title: "Collaboration Features", description: "Real-time collaboration on shared items", votes: 176 },
      { title: "Enterprise SSO", description: "SAML and OIDC integration", votes: 92 },
    ],
  },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Completed",
  },
  "in-progress": {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "In Progress",
  },
  planned: {
    icon: Circle,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    label: "Planned",
  },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
            <Sparkles className="w-4 h-4" />
            Product Roadmap
          </div>
          <h1 className="text-5xl font-bold mb-4">What&apos;s Next</h1>
          <p className="text-xl text-zinc-400 mb-8">
            See what we&apos;re building and vote on features you&apos;d like to see next.
          </p>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-zinc-400">Completed</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-zinc-400">In Progress</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
              <Circle className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Planned</span>
            </div>
          </div>
        </div>

        {/* Roadmap Timeline */}
        <div className="space-y-12">
          {roadmapItems.map((section) => {
            const config = statusConfig[section.status as keyof typeof statusConfig];
            const Icon = config.icon;
            
            return (
              <div key={section.quarter}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{section.quarter}</h2>
                    <p className="text-sm text-zinc-500">{config.label}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.items.map((item) => (
                    <div
                      key={item.title}
                      className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-violet-400 transition-colors">
                          {item.title}
                        </h3>
                        {"votes" in item && (
                          <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500/50 hover:bg-zinc-700 transition-all text-sm">
                            <Vote className="w-4 h-4" />
                            {item.votes}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Community Input CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Have a feature request?</h3>
              <p className="text-zinc-400 mb-4">
                We&apos;d love to hear your ideas! Join our community to suggest features, vote on proposals, and shape the future of Launcher.
              </p>
              <div className="flex gap-3">
                <a
                  href="/community"
                  className="px-6 py-2 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                >
                  Join Community
                </a>
                <a
                  href="https://github.com/launcher/launcher/discussions"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2 rounded-lg bg-zinc-800 border border-zinc-700 font-medium hover:bg-zinc-700 transition-all"
                >
                  GitHub Discussions
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
