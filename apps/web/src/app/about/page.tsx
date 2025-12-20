import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Rocket, Heart, Users, Globe, Target, Zap } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Performance First",
    description: "We obsess over every millisecond. Built with Rust and Tauri for unmatched speed.",
  },
  {
    icon: Users,
    title: "User-Centric",
    description: "Every feature is designed with real user workflows in mind. We listen and iterate.",
  },
  {
    icon: Globe,
    title: "Open & Transparent",
    description: "Open source core, public roadmap, and transparent development process.",
  },
  {
    icon: Heart,
    title: "Community Driven",
    description: "Built by developers, for everyone. Our community shapes the product.",
  },
];

const team = [
  { name: "Markus Heien", role: "Founder", avatar: "MH" },
];

const stats = [
  { label: "Active Users", value: "50k+" },
  { label: "Plugins", value: "100+" },
  { label: "Countries", value: "120+" },
  { label: "GitHub Stars", value: "12k+" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
            <Rocket className="w-4 h-4" />
            About Us
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Building the{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-fuchsia-400">
              ultimate launcher
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl">
            I started developing the Launcher in 2025 with a simple mission: make every computer more productive, 
            accessible, and delightful to use. What began as a developer tool has evolved into a 
            platform for everyone.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <div className="text-3xl font-bold text-violet-400 mb-2">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-8 h-8 text-violet-400" />
            <h2 className="text-3xl font-bold">The Mission</h2>
          </div>
          <div className="p-8 rounded-2xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
            <p className="text-lg text-zinc-300 leading-relaxed">
              I believe that everyone deserves a fast, powerful, and customizable way to interact with their computer. 
              Whether you&apos;re a developer shipping code, a designer creating art, a gamer launching your favorite titles, 
              or a professional managing your workflow—Launcher adapts to you.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8">My Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value) => (
              <div key={value.title} className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-zinc-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Who are we?</h2>
          <div className="flex justify-center">
            <div className="grid grid-cols-1 gap-6">
              {team.map((member) => (
                <div key={member.name} className="text-center">
                  <div className="w-24 h-24 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {member.avatar}
                  </div>
                  <h3 className="font-semibold mb-1">{member.name}</h3>
                  <p className="text-sm text-zinc-500">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Join Us */}
        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <h2 className="text-2xl font-bold mb-4">Join the Journey</h2>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            I&apos;m always looking for talented people who share our passion for building great software. 
            Check out our open positions or get involved in our open source community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/careers"
              className="px-6 py-3 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
            >
              View Open Positions
            </a>
            <a
              href="/community"
              className="px-6 py-3 rounded-lg bg-zinc-800 border border-zinc-700 font-medium hover:bg-zinc-700 transition-all"
            >
              Join Community
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
