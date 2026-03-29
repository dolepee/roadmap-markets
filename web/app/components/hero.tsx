"use client";

import { motion } from "framer-motion";
import { ArrowDown, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-24 md:pb-28 md:pt-32">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(57,255,20,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-neon/15 bg-neon/5 px-4 py-1.5"
        >
          <Zap className="h-3.5 w-3.5 text-neon" />
          <span className="text-xs font-semibold uppercase tracking-widest text-neon">
            Built on GenLayer
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-black leading-[1.05] tracking-tight md:text-7xl lg:text-8xl"
        >
          Trade whether{" "}
          <span className="gradient-text">
            crypto teams actually ship.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl"
        >
          Prediction markets for roadmap milestones. GenLayer resolves delivery
          from live public evidence&mdash;no oracles, no committees.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="#markets"
            className="group flex h-12 items-center gap-2.5 rounded-lg bg-neon px-7 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Browse Markets
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </a>
          <a
            href="#how-it-works"
            className="flex h-12 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-7 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-100"
          >
            How It Works
          </a>
        </motion.div>

        {/* Terminal line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mx-auto mt-14 max-w-lg rounded-lg border border-zinc-800/60 bg-surface-1 px-5 py-3"
        >
          <p className="font-mono text-xs text-zinc-500">
            <span className="text-neon">$</span>{" "}
            <span className="text-zinc-400">genlayer resolve</span>{" "}
            <span className="text-cyan">--market</span>{" "}
            <span className="text-zinc-300">ETH-PECTRA-Q2</span>{" "}
            <span className="text-zinc-600">// deterministic, trustless</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
