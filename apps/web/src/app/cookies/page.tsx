import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Cookie, Calendar } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6">
            <Cookie className="w-4 h-4" />
            Cookie Policy
          </div>
          <h1 className="text-5xl font-bold mb-4">Cookie Policy</h1>
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Last updated: December 20, 2025</span>
          </div>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">What Are Cookies</h2>
              <p className="text-zinc-400 leading-relaxed">
                Cookies are small text files that are stored on your device when you visit our website. 
                They help us provide you with a better experience by remembering your preferences and 
                understanding how you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">How We Use Cookies</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">We use cookies for the following purposes:</p>
              
              <h3 className="text-xl font-semibold mb-3 text-zinc-300">Essential Cookies</h3>
              <p className="text-zinc-400 mb-4">
                These cookies are necessary for the website to function properly. They enable core functionality 
                such as security, network management, and accessibility.
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400 mb-6">
                <li>Authentication and session management</li>
                <li>Security and fraud prevention</li>
                <li>Load balancing</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-zinc-300">Analytics Cookies</h3>
              <p className="text-zinc-400 mb-4">
                These cookies help us understand how visitors interact with our website by collecting and 
                reporting information anonymously.
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400 mb-6">
                <li>Page views and navigation patterns</li>
                <li>Time spent on pages</li>
                <li>Error tracking</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-zinc-300">Preference Cookies</h3>
              <p className="text-zinc-400 mb-4">
                These cookies enable the website to remember information that changes the way the website 
                behaves or looks, such as your preferred language or region.
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Language preferences</li>
                <li>Theme preferences (light/dark mode)</li>
                <li>Layout customizations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We use the following third-party services that may set cookies:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-zinc-300">Stripe:</strong> For payment processing</li>
                <li><strong className="text-zinc-300">Stack Auth:</strong> For authentication</li>
                <li><strong className="text-zinc-300">Analytics:</strong> For usage analytics (if enabled)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Managing Cookies</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                You can control and manage cookies in various ways:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Use our cookie consent banner to customize your preferences</li>
                <li>Configure your browser settings to block or delete cookies</li>
                <li>Use browser extensions to manage cookies</li>
              </ul>
              <p className="text-zinc-400 leading-relaxed mt-4">
                Please note that blocking certain cookies may impact your experience on our website and 
                limit the functionality available to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Cookie Duration</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We use both session cookies (which expire when you close your browser) and persistent 
                cookies (which remain on your device for a set period or until you delete them).
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-zinc-300">Session cookies:</strong> Deleted when you close your browser</li>
                <li><strong className="text-zinc-300">Persistent cookies:</strong> Typically expire after 1-12 months</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Updates to This Policy</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may update this Cookie Policy from time to time. We will notify you of any changes by 
                posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have questions about our use of cookies, please contact us at{" "}
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
