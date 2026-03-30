"use client";

import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";
import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-terminal/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-sky-500 dark:from-neon dark:to-cyan">
            <Activity className="h-4 w-4 text-white dark:text-black" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Roadmap<span className="text-emerald-600 dark:text-neon">Markets</span>
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "Markets", href: "#markets" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Why GenLayer", href: "#why-genlayer" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Theme + Wallet */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
