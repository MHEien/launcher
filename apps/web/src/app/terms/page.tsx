import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { FileText, Calendar } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6">
            <FileText className="w-4 h-4" />
            Terms of Service
          </div>
          <h1 className="text-5xl font-bold mb-4">Terms of Service</h1>
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Last updated: December 15, 2024</span>
          </div>
        </div>

        <div className="prose prose-invert prose-zinc max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Acceptance of Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                By accessing and using Launcher, you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Use License</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Permission is granted to temporarily download one copy of Launcher per device for personal, 
                non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
              </p>
              <p className="text-zinc-400 leading-relaxed mb-4">Under this license you may not:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>Attempt to decompile or reverse engineer any software contained in Launcher</li>
                <li>Remove any copyright or proprietary notations from the materials</li>
                <li>Transfer the materials to another person or mirror the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">User Accounts</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                When you create an account with us, you must provide accurate, complete, and current information. 
                Failure to do so constitutes a breach of the Terms.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                You are responsible for safeguarding the password and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Subscriptions</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Some parts of the Service are billed on a subscription basis. You will be billed in advance on a 
                recurring and periodic basis (monthly or annually).
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>You can cancel your subscription at any time</li>
                <li>Refunds are provided on a case-by-case basis</li>
                <li>We reserve the right to modify subscription fees with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Plugin Marketplace</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                The Plugin Marketplace allows third-party developers to distribute plugins. We are not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>The functionality or security of third-party plugins</li>
                <li>Data collected by third-party plugins</li>
                <li>Support for third-party plugins</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Prohibited Uses</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">You may not use Launcher:</p>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
                <li>To upload or transmit viruses or any other type of malicious code</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
              <p className="text-zinc-400 leading-relaxed">
                In no event shall Launcher or its suppliers be liable for any damages (including, without limitation, 
                damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
                to use Launcher.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Termination</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason 
                whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any 
                material changes by posting the new Terms on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:legal@launcher.app" className="text-violet-400 hover:text-violet-300">
                  legal@launcher.app
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
