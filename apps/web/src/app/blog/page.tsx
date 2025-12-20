import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const posts = [
  {
    slug: "introducing-launcher-1-0",
    title: "Introducing Launcher 1.0: The Ultimate Productivity Tool",
    excerpt: "After months of development and feedback from our beta users, we're excited to announce the official release of Launcher 1.0.",
    date: "December 15, 2024",
    readTime: "5 min read",
    category: "Product",
    image: "🚀",
  },
  {
    slug: "building-wasm-plugins",
    title: "Building WASM Plugins: A Developer's Guide",
    excerpt: "Learn how to create powerful, secure plugins for Launcher using WebAssembly. We'll walk through building your first plugin from scratch.",
    date: "December 10, 2024",
    readTime: "8 min read",
    category: "Tutorial",
    image: "🔧",
  },
  {
    slug: "ai-powered-workflows",
    title: "AI-Powered Workflows: The Future of Productivity",
    excerpt: "Discover how Launcher's AI integration can transform your daily workflow with intelligent suggestions and automation.",
    date: "December 5, 2024",
    readTime: "6 min read",
    category: "Features",
    image: "✨",
  },
  {
    slug: "why-rust-and-tauri",
    title: "Why We Chose Rust and Tauri",
    excerpt: "A deep dive into our technology stack and why we believe Rust and Tauri are the perfect foundation for a modern launcher.",
    date: "November 28, 2024",
    readTime: "10 min read",
    category: "Engineering",
    image: "⚡",
  },
  {
    slug: "community-spotlight",
    title: "Community Spotlight: Top Plugins of 2024",
    excerpt: "Celebrating the amazing plugins created by our community. Here are the most popular and innovative plugins of the year.",
    date: "November 20, 2024",
    readTime: "7 min read",
    category: "Community",
    image: "🌟",
  },
  {
    slug: "dashboard-widgets-guide",
    title: "Customizing Your Dashboard: A Complete Guide",
    excerpt: "Learn how to create the perfect dashboard layout with widgets, shortcuts, and personalized configurations.",
    date: "November 15, 2024",
    readTime: "6 min read",
    category: "Tutorial",
    image: "📊",
  },
];

const categories = ["All", "Product", "Tutorial", "Features", "Engineering", "Community"];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
            <Sparkles className="w-4 h-4" />
            Blog
          </div>
          <h1 className="text-5xl font-bold mb-4">Latest Updates</h1>
          <p className="text-xl text-zinc-400">
            Product updates, tutorials, and insights from the Launcher team.
          </p>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                category === "All"
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        <Link
          href={`/blog/${posts[0].slug}`}
          className="block mb-12 group"
        >
          <div className="relative p-8 md:p-12 rounded-2xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl opacity-20">{posts[0].image}</div>
            <div className="relative">
              <div className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-4">
                Featured
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 group-hover:text-violet-400 transition-colors">
                {posts[0].title}
              </h2>
              <p className="text-lg text-zinc-400 mb-6 max-w-2xl">
                {posts[0].excerpt}
              </p>
              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {posts[0].date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {posts[0].readTime}
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.slice(1).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{post.image}</div>
                <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
                  {post.category}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-violet-400 transition-colors">
                {post.title}
              </h3>
              <p className="text-zinc-400 mb-4 line-clamp-2">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <h2 className="text-2xl font-bold mb-2">Never miss an update</h2>
          <p className="text-zinc-400 mb-6">
            Subscribe to our newsletter for product updates, tutorials, and more.
          </p>
          <div className="flex gap-3 max-w-md mx-auto">
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
