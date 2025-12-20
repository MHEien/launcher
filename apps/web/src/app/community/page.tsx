import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Users, MessageCircle, Github, Twitter, Heart, Code2, HelpCircle, Sparkles } from "lucide-react";

const communities = [
  {
    icon: MessageCircle,
    title: "Discord",
    description: "Join 5,000+ members for real-time chat, support, and discussions",
    members: "5,000+",
    link: "https://discord.gg/launcher",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Github,
    title: "GitHub",
    description: "Contribute to the project, report bugs, and request features",
    members: "12k+ stars",
    link: "https://github.com/launcher/launcher",
    color: "from-gray-600 to-gray-800",
  },
  {
    icon: Twitter,
    title: "Twitter",
    description: "Follow us for updates, tips, and community highlights",
    members: "8,000+",
    link: "https://twitter.com/launcher",
    color: "from-blue-400 to-blue-600",
  },
];

const ways = [
  {
    icon: Code2,
    title: "Build Plugins",
    description: "Create plugins and share them with the community",
    link: "/docs/plugins",
  },
  {
    icon: HelpCircle,
    title: "Help Others",
    description: "Answer questions and share your knowledge",
    link: "https://discord.gg/launcher",
  },
  {
    icon: Heart,
    title: "Contribute Code",
    description: "Submit pull requests to improve Launcher",
    link: "https://github.com/launcher/launcher",
  },
  {
    icon: Sparkles,
    title: "Share Feedback",
    description: "Help shape the future with your ideas",
    link: "/roadmap",
  },
];

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
            <Users className="w-4 h-4" />
            Community
          </div>
          <h1 className="text-5xl font-bold mb-4">Join the Community</h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Connect with thousands of Launcher users, share tips, get help, and shape the future of the product.
          </p>
        </div>

        {/* Community Platforms */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Where to Find Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communities.map((community) => (
              <a
                key={community.title}
                href={community.link}
                target="_blank"
                rel="noreferrer"
                className="group p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 transition-all"
              >
                <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${community.color} flex items-center justify-center mb-4`}>
                  <community.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                  {community.title}
                </h3>
                <p className="text-zinc-400 mb-4">{community.description}</p>
                <div className="text-sm text-violet-400 font-medium">{community.members} members</div>
              </a>
            ))}
          </div>
        </div>

        {/* Ways to Contribute */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Ways to Contribute</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ways.map((way) => (
              <a
                key={way.title}
                href={way.link}
                className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  <way.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                  {way.title}
                </h3>
                <p className="text-zinc-400">{way.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
          <h2 className="text-2xl font-bold mb-6">Community Guidelines</h2>
          <div className="space-y-4 text-zinc-400">
            <p>
              <strong className="text-zinc-200">Be respectful:</strong> Treat everyone with kindness and respect. 
              We have zero tolerance for harassment or discrimination.
            </p>
            <p>
              <strong className="text-zinc-200">Be helpful:</strong> Share your knowledge and help others learn. 
              We&apos;re all here to grow together.
            </p>
            <p>
              <strong className="text-zinc-200">Be constructive:</strong> Provide constructive feedback and criticism. 
              Focus on solutions, not just problems.
            </p>
            <p>
              <strong className="text-zinc-200">No spam:</strong> Don&apos;t post promotional content or spam. 
              Share relevant, valuable content only.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
