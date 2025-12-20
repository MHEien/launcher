import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Shield, Lock, Eye, AlertTriangle, CheckCircle2, Mail } from "lucide-react";

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data transmitted between your device and our servers is encrypted using TLS 1.3.",
  },
  {
    icon: Shield,
    title: "WASM Sandboxing",
    description: "Plugins run in isolated WebAssembly sandboxes with limited system access.",
  },
  {
    icon: Eye,
    title: "Privacy by Design",
    description: "Your file index and search history stay local by default. Cloud sync is opt-in.",
  },
  {
    icon: CheckCircle2,
    title: "Regular Audits",
    description: "We conduct regular security audits and penetration testing.",
  },
];

const bestPractices = [
  "Use a strong, unique password for your account",
  "Enable two-factor authentication (2FA) when available",
  "Keep your Launcher app updated to the latest version",
  "Only install plugins from trusted developers",
  "Review plugin permissions before installation",
  "Report suspicious activity immediately",
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 mb-6">
            <Shield className="w-4 h-4" />
            Security
          </div>
          <h1 className="text-5xl font-bold mb-4">Security at Launcher</h1>
          <p className="text-xl text-zinc-400 max-w-3xl">
            Your security and privacy are our top priorities. Learn about the measures we take to 
            protect your data and how you can stay safe.
          </p>
        </div>

        {/* Security Features */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">How We Protect You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityFeatures.map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Secure Infrastructure</h2>
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold mb-3 text-emerald-400">Cloud Security</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• AWS infrastructure</li>
                  <li>• SOC 2 compliant hosting</li>
                  <li>• Automated backups</li>
                  <li>• DDoS protection</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-emerald-400">Data Protection</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Encryption at rest</li>
                  <li>• Encryption in transit</li>
                  <li>• Secure key management</li>
                  <li>• Regular data purging</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-emerald-400">Access Control</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Role-based access</li>
                  <li>• Multi-factor authentication</li>
                  <li>• Audit logging</li>
                  <li>• Least privilege principle</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Security Best Practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPractices.map((practice) => (
              <div key={practice} className="flex items-start gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300">{practice}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerability Disclosure */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8">Responsible Disclosure</h2>
          <div className="p-8 rounded-2xl bg-linear-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Found a Security Issue?</h3>
                <p className="text-zinc-400 mb-4">
                  We take security vulnerabilities seriously. If you&apos;ve discovered a security issue, 
                  please report it responsibly.
                </p>
                <div className="space-y-2 text-zinc-400 mb-6">
                  <p><strong className="text-zinc-200">Do:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email us at security@launcher.app with details</li>
                    <li>Give us reasonable time to respond before public disclosure</li>
                    <li>Provide steps to reproduce the issue</li>
                  </ul>
                  <p className="mt-4"><strong className="text-zinc-200">Don&apos;t:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Publicly disclose the vulnerability before we&apos;ve addressed it</li>
                    <li>Access or modify user data without permission</li>
                    <li>Perform actions that could harm our users or services</li>
                  </ul>
                </div>
                <a
                  href="mailto:security@launcher.app"
                  className="inline-block px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 font-medium transition-colors"
                >
                  Report Security Issue
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <Mail className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Security Questions?</h2>
          <p className="text-zinc-400 mb-6">
            For general security questions or concerns, contact our security team.
          </p>
          <a
            href="mailto:security@launcher.app"
            className="inline-block px-6 py-3 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            security@launcher.app
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
