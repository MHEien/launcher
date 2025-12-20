import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Download, Image as ImageIcon, FileText, Mail } from "lucide-react";

const assets = [
  {
    title: "Logo Package",
    description: "SVG, PNG, and AI formats in various sizes",
    size: "2.4 MB",
    type: "ZIP",
  },
  {
    title: "Screenshots",
    description: "High-resolution product screenshots",
    size: "8.1 MB",
    type: "ZIP",
  },
  {
    title: "Brand Guidelines",
    description: "Colors, typography, and usage guidelines",
    size: "1.2 MB",
    type: "PDF",
  },
];

const facts = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "Remote-first" },
  { label: "Active Users", value: "50,000+" },
  { label: "Plugins", value: "100+" },
  { label: "Countries", value: "120+" },
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-16">
          <h1 className="text-5xl font-bold mb-4">Press Kit</h1>
          <p className="text-xl text-zinc-400">
            Resources for journalists, bloggers, and media professionals.
          </p>
        </div>

        {/* Quick Facts */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Quick Facts</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {facts.map((fact) => (
              <div key={fact.label} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <div className="text-2xl font-bold text-violet-400 mb-1">{fact.value}</div>
                <div className="text-sm text-zinc-500">{fact.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">About Launcher</h2>
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-zinc-300 leading-relaxed mb-4">
              Launcher is a cross-platform productivity application that helps users access apps, files, 
              and services instantly. Built with Rust and Tauri for exceptional performance, Launcher 
              features a powerful plugin ecosystem, AI integration, and customizable workflows.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              What started as a developer tool has evolved into a platform for everyone—from professionals 
              managing complex workflows to gamers launching their favorite titles. With over 50,000 active 
              users across 120 countries, Launcher is redefining how people interact with their computers.
            </p>
          </div>
        </div>

        {/* Download Assets */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Download Assets</h2>
          <div className="space-y-4">
            {assets.map((asset) => (
              <div
                key={asset.title}
                className="flex items-center justify-between p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    {asset.type === "ZIP" ? (
                      <ImageIcon className="w-6 h-6 text-violet-400" />
                    ) : (
                      <FileText className="w-6 h-6 text-violet-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 group-hover:text-violet-400 transition-colors">
                      {asset.title}
                    </h3>
                    <p className="text-sm text-zinc-500">{asset.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-500">{asset.size}</span>
                  <button className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="p-8 rounded-2xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Media Inquiries</h2>
              <p className="text-zinc-400 mb-4">
                For press inquiries, interviews, or additional information, please contact our media team.
              </p>
              <a
                href="mailto:press@launcher.app"
                className="inline-block px-6 py-2 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
              >
                press@launcher.app
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
