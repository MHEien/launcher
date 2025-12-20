import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";
import { Briefcase, MapPin, Clock, ArrowRight, Heart, Users, Zap, Globe } from "lucide-react";
import Link from "next/link";

const openings = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Build beautiful, performant UIs with React, TypeScript, and Tailwind.",
  },
  {
    title: "Rust Developer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Work on our core Tauri application and plugin runtime.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
    description: "Design delightful user experiences for millions of users.",
  },
  {
    title: "Developer Advocate",
    department: "Community",
    location: "Remote",
    type: "Full-time",
    description: "Help developers build amazing plugins and integrations.",
  },
  {
    title: "Technical Writer",
    department: "Documentation",
    location: "Remote",
    type: "Contract",
    description: "Create comprehensive documentation and tutorials.",
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Remote First",
    description: "Work from anywhere in the world",
  },
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive health insurance",
  },
  {
    icon: Zap,
    title: "Learning Budget",
    description: "$2,000/year for courses & conferences",
  },
  {
    icon: Users,
    title: "Team Retreats",
    description: "Annual company-wide gatherings",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 mb-6">
            <Briefcase className="w-4 h-4" />
            We&apos;re Hiring
          </div>
          <h1 className="text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Help us build the ultimate launcher for everyone. We&apos;re a small, remote-first team 
            working on a product used by thousands of people every day.
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Why Join Launcher?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-zinc-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job) => (
              <Link
                key={job.title}
                href={`/careers/${job.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="block p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-zinc-400 mb-4">{job.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">
                    {job.department}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    {job.type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 rounded-2xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center">
          <h2 className="text-2xl font-bold mb-4">Don&apos;t see a perfect fit?</h2>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            We&apos;re always interested in hearing from talented people. Send us your resume and 
            tell us what you&apos;d like to work on.
          </p>
          <a
            href="mailto:careers@launcher.app"
            className="inline-block px-6 py-3 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            Get in Touch
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
