"use client";

import { motion } from "framer-motion";
import {
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Banknote,
} from "lucide-react";
import type { ReactNode } from "react";

/* ── How It Works ─────────────────────────────────────────── */

const steps: Array<{
  title: string;
  desc: string;
  icon: ReactNode;
}> = [
  {
    title: "Create Market",
    desc: "Open a market around a real roadmap promise. Attach the product, docs, repo, and chain URLs that matter.",
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    title: "Take Positions",
    desc: "Connect your wallet and buy YES or NO before the deadline. Your position is tracked onchain.",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    title: "GenLayer Resolves",
    desc: "At resolution time, validators independently fetch live evidence and evaluate the same 4-field boolean checklist.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Claim Winnings",
    desc: "Winners split the losing pool minus protocol fee, proportional to their stake. Claim directly to your wallet.",
    icon: <Banknote className="h-5 w-5" />,
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-zinc-200 px-6 py-20 md:py-28 dark:border-zinc-800/60" id="how-it-works">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">How It Works</h2>
          <p className="mt-3 text-zinc-500">
            Four steps from market creation to payout.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-zinc-300 via-zinc-200 to-transparent md:left-1/2 md:block dark:from-neon/40 dark:via-cyan/30 dark:to-transparent" />

          <div className="grid gap-6 md:gap-0">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative md:flex md:items-start md:gap-8 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } ${i > 0 ? "md:mt-2" : ""}`}
              >
                {/* Card */}
                <div
                  className={`flex-1 ${
                    i % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}
                >
                  <div
                    className={`inline-block rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-surface-1 dark:shadow-none dark:hover:border-zinc-700/60 ${
                      i % 2 === 0 ? "md:ml-auto" : ""
                    }`}
                    style={{ maxWidth: 380 }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-neon/10 dark:text-neon">
                        {s.icon}
                      </div>
                      <div>
                        <span className="font-mono text-xs text-zinc-300 dark:text-zinc-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {s.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-500">
                      {s.desc}
                    </p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="hidden md:flex md:flex-col md:items-center">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-300 bg-white dark:border-neon/40 dark:bg-terminal">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-neon dark:shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
                  </div>
                </div>

                {/* Spacer for the other side */}
                <div className="hidden flex-1 md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Terminal Code Window ─────────────────────────────────── */

function TerminalWindow({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-800/80 dark:bg-[#0c0c0e] dark:shadow-2xl dark:glow-cyan">
      {/* macOS title bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800/60">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-green-500/80" />
        </div>
        <span className="ml-2 font-mono text-xs text-zinc-400 dark:text-zinc-600">{title}</span>
      </div>
      {/* Content */}
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

function JsonLine({ indent, keyName, value, comma }: { indent: number; keyName: string; value: string; comma?: boolean }) {
  return (
    <div style={{ paddingLeft: indent * 20 }} className="font-mono text-sm leading-7">
      <span className="text-sky-600 dark:text-cyan">&quot;{keyName}&quot;</span>
      <span className="text-zinc-400 dark:text-zinc-600">: </span>
      <span className={value === "true" ? "text-emerald-600 font-semibold dark:text-neon dark:font-semibold" : "text-rose-600 font-semibold dark:text-crimson dark:font-semibold"}>
        {value}
      </span>
      {comma && <span className="text-zinc-400 dark:text-zinc-600">,</span>}
    </div>
  );
}

/* ── Why GenLayer ─────────────────────────────────────────── */

export function WhyGenLayer() {
  return (
    <section className="border-t border-zinc-200 px-6 py-20 md:py-28 dark:border-zinc-800/60" id="why-genlayer">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">Why GenLayer</h2>
          <p className="mt-3 text-zinc-500">
            The resolution layer is the product, not the UI.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: explanation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800/60 dark:bg-surface-1 dark:shadow-none"
          >
            <h3 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Structured Resolution, Not Oracle Feeds
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              The contract does not ask &ldquo;did they ship?&rdquo;&mdash;it asks for a
              strict four-field boolean checklist and derives YES or NO
              deterministically. Validators independently evaluate the same
              evidence against the same schema.
            </p>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              If the booleans match, the market settles. No committee, no
              subjective vote. Evidence URLs are fixed at market creation and
              served from public sources, ensuring every validator reads the
              same material.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Deterministic", "Trustless", "No Oracles", "Onchain"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:bg-surface-2 dark:text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: code window */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <TerminalWindow title="resolution_checklist.json">
              <div className="text-zinc-500 font-mono text-sm leading-7">
                <div>{"{"}</div>
                <JsonLine indent={1} keyName="product_live" value="true" comma />
                <JsonLine indent={1} keyName="feature_usable" value="true" comma />
                <JsonLine indent={1} keyName="docs_or_changelog_live" value="true" comma />
                <JsonLine indent={1} keyName="repo_or_chain_evidence" value="true" />
                <div>{"}"}</div>
              </div>
              <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800/60">
                <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  <span className="text-emerald-600 dark:text-neon">// </span>
                  All four fields must be <span className="text-emerald-600 font-semibold dark:text-neon">true</span> for
                  a <span className="text-emerald-600 font-semibold dark:text-neon">YES</span> resolution.
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  <span className="text-emerald-600 dark:text-neon">// </span>
                  Validators fetch live URLs and evaluate independently.
                </p>
              </div>
            </TerminalWindow>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-surface-1 dark:shadow-none">
              <h3 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Live Evidence, Not Sentiment
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                At resolution time the contract fetches the actual product page,
                documentation, repository, and chain explorer. Validators read
                real delivery artifacts, not token price or social hype.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
