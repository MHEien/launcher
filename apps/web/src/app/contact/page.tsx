import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Mail, MessageCircle, Github, Twitter, Send } from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "For general inquiries and support",
    link: "mailto:hello@launcher.app",
    linkText: "hello@launcher.app",
  },
  {
    icon: MessageCircle,
    title: "Discord",
    description: "Join our community for real-time chat",
    link: "https://discord.gg/launcher",
    linkText: "Join Discord",
  },
  {
    icon: Github,
    title: "GitHub",
    description: "Report bugs and request features",
    link: "https://github.com/launcher/launcher/issues",
    linkText: "Open an Issue",
  },
  {
    icon: Twitter,
    title: "Twitter",
    description: "Follow us for updates and news",
    link: "https://twitter.com/launcher",
    linkText: "@launcher",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-16">
          <h1 className="text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-zinc-400">
            Have questions? We&apos;d love to hear from you. Choose your preferred way to reach us.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {contactMethods.map((method) => (
            <a
              key={method.title}
              href={method.link}
              target={method.link.startsWith('http') ? '_blank' : undefined}
              rel={method.link.startsWith('http') ? 'noreferrer' : undefined}
              className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <method.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
              <p className="text-zinc-400 mb-3">{method.description}</p>
              <span className="text-violet-400 font-medium">{method.linkText}</span>
            </a>
          ))}
        </div>

        {/* Contact Form */}
        <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
          <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                rows={6}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none resize-none"
                placeholder="Tell us more..."
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </form>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500">
            Looking for answers?{" "}
            <a href="/faq" className="text-violet-400 hover:text-violet-300 transition-colors">
              Check our FAQ
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
