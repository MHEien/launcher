import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Shield, Calendar } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6">
            <Shield className="w-4 h-4" />
            Privacy Policy
          </div>
          <h1 className="text-5xl font-bold mb-4">Privacy Policy</h1>
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Last updated: December 15, 2024</span>
          </div>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Introduction</h2>
              <p className="text-zinc-400 leading-relaxed">
                At Launcher, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our application and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-3 text-zinc-300">Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 text-zinc-400 mb-4">
                <li>Account information (email, name) when you create an account</li>
                <li>Payment information when you subscribe to Pro or Team plans</li>
                <li>Support communications and feedback you provide</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 text-zinc-300">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Usage data (features used, plugins installed)</li>
                <li>Device information (OS version, app version)</li>
                <li>Performance and crash data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>To provide and maintain our services</li>
                <li>To process your transactions and subscriptions</li>
                <li>To send you updates and marketing communications (with your consent)</li>
                <li>To improve our application and develop new features</li>
                <li>To detect and prevent fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Storage and Security</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>All data is encrypted in transit using TLS</li>
                <li>Sensitive data is encrypted at rest</li>
                <li>We use secure cloud infrastructure (AWS, Neon)</li>
                <li>Regular security audits and penetration testing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Local Data Processing</h2>
              <p className="text-zinc-400 leading-relaxed">
                Launcher is designed with privacy in mind. Your file index, search history, and most 
                application data is stored locally on your device. We only sync data to the cloud if 
                you explicitly enable cloud sync (Pro feature).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Stripe for payment processing</li>
                <li>Stack Auth for authentication</li>
                <li>Neon for database hosting</li>
                <li>Upstash for caching</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@launcher.app" className="text-violet-400 hover:text-violet-300">
                  privacy@launcher.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
