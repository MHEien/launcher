import { Header } from "@/components/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { PluginShowcase } from "@/components/landing/plugin-showcase";
import { Pricing } from "@/components/landing/pricing";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-violet-500/30 selection:text-violet-200">
      <Header />
      <main>
        <Hero />
        <Features />
        <PluginShowcase />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
