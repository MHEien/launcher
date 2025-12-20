import Link from "next/link";
import Image from "next/image";
import { Github, MessageCircle, Mail, Heart, ExternalLink } from "lucide-react";

type Section = {
  product: FooterLink[];
  resources: FooterLink[];
  company: FooterLink[];
  legal: FooterLink[];
}

type FooterLink = {
  name: string;
  href: string;
  badge?: string;
};

const footerLinks: Section = {
  product: [
    { name: "Download", href: "/download" },
    { name: "Marketplace", href: "/app" },
    { name: "Pricing", href: "/pricing" },
    { name: "Changelog", href: "/changelog" },
    { name: "Roadmap", href: "/roadmap" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/docs/api", badge: "Coming Soon" },
    { name: "Plugin SDK", href: "/docs/plugins" },
    { name: "Submit Plugin", href: "/plugins/submit" },
    { name: "Community", href: "/community" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    //{ name: "Careers", href: "/careers", badge: "Hiring" },
    { name: "Contact", href: "/contact" },
    { name: "Press Kit", href: "/press" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Security", href: "/security" },
  ],
};

const socialLinks = [
  { name: "GitHub", href: "https://github.com/MHEien/launcher", icon: Github },
  { name: "Discord", href: "https://discord.gg/launcher", icon: MessageCircle },
  { name: "Email", href: "mailto:markus@hdsoftware.no", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Image
                  src="/icon.png"
                  alt="Launcher"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <span className="font-bold text-xl">Launcher</span>
            </Link>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs leading-relaxed">
              The ultimate launcher for everyone. Fast, extensible, and built with 
              Rust for blazing performance.
            </p>
            
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-sm text-zinc-200 mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-sm text-zinc-200 mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm text-zinc-200 mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    {link.name}
                    {link.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm text-zinc-200 mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <span>&copy; {new Date().getFullYear()} Launcher Inc.</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Made with</span>
              <Heart className="w-3.5 h-3.5 text-red-500 hidden md:inline mx-0.5" />
              <span className="hidden md:inline">using Rust & Tauri</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a 
                href="https://status.launcher.app" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                All systems operational
              </a>
              <a 
                href="https://github.com/launcher/launcher" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
              >
                <Github className="w-4 h-4" />
                Star on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
