"use client";

import Link from "next/link";
import { UserButton, useUser } from "@stackframe/stack";

export function Header() {
  const user = useUser();

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-linear-to-br from-violet-500 to-fuchsia-500 rounded-lg" />
            <h1 className="text-xl font-semibold">Launcher</h1>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/app"
              className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
            >
              Plugins
            </Link>
            {user ? (
              <>
                <Link
                  href="/app/dashboard"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <Link
                href="/handler/sign-in"
                className="text-sm bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
