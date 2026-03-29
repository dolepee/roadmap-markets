"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  FileText,
  GitBranch,
  Link2,
  Globe,
  Check,
  XIcon,
  Copy,
  Loader2,
  TrendingUp,
  BarChart3,
  Clock,
  Shield,
} from "lucide-react";
import { useWallet } from "../../lib/wallet-context";

/* ── Types ────────────────────────────────────────────────── */

type TxStatus =
  | "PENDING"
  | "CANCELED"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "FINALIZED"
  | "UNDETERMINED"
  | "FAILED"
  | "idle";

type Checklist = {
  product_live: boolean;
  feature_usable: boolean;
  docs_or_changelog_live: boolean;
  repo_or_chain_evidence: boolean;
};

type MarketRecord = {
  market_id: string;
  question: string;
  project_name: string;
  milestone_text: string;
  deadline_text: string;
  product_url: string;
  docs_url: string;
  repo_url: string;
  chain_url: string;
  fee_bps: number;
  yes_pool: number;
  no_pool: number;
  resolved: boolean;
  resolution: string;
  checklist: Checklist;
  notes: string;
  creator: string;
  resolved_by: string;
  fee_amount: number;
};

type PositionRecord = {
  market_id: string;
  trader: string;
  yes_amount: number;
  no_amount: number;
  claimed: boolean;
};

type TxPanelState = {
  action: string;
  hash: string;
  status: TxStatus;
  message: string;
  error?: string;
};

/* ── Constants ────────────────────────────────────────────── */

const CHECKLIST: Array<{ key: keyof Checklist; label: string }> = [
  { key: "product_live", label: "Product live" },
  { key: "feature_usable", label: "Feature usable" },
  { key: "docs_or_changelog_live", label: "Docs / changelog" },
  { key: "repo_or_chain_evidence", label: "Repo / chain evidence" },
];

const TX_STEPS = ["Submitted", "Proposing", "Accepted", "Finalized"];

const CONTRACT = (process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

/* ── Helpers ──────────────────────────────────────────────── */

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function m2o(v: unknown): Record<string, unknown> {
  if (v instanceof Map) {
    const o: Record<string, unknown> = {};
    for (const [k, val] of v.entries())
      o[String(k)] = val instanceof Map ? m2o(val) : val;
    return o;
  }
  if (v && typeof v === "object" && !Array.isArray(v))
    return v as Record<string, unknown>;
  return {};
}

function normChecklist(v: unknown): Checklist {
  const s = m2o(v);
  return {
    product_live: Boolean(s.product_live),
    feature_usable: Boolean(s.feature_usable),
    docs_or_changelog_live: Boolean(s.docs_or_changelog_live),
    repo_or_chain_evidence: Boolean(s.repo_or_chain_evidence),
  };
}

function normMarket(v: unknown): MarketRecord {
  if (typeof v === "string") {
    try {
      return normMarket(JSON.parse(v));
    } catch {
      /* */
    }
  }
  const s = m2o(v);
  return {
    market_id: String(s.market_id ?? ""),
    question: String(s.question ?? ""),
    project_name: String(s.project_name ?? ""),
    milestone_text: String(s.milestone_text ?? ""),
    deadline_text: String(s.deadline_text ?? ""),
    product_url: String(s.product_url ?? ""),
    docs_url: String(s.docs_url ?? ""),
    repo_url: String(s.repo_url ?? ""),
    chain_url: String(s.chain_url ?? ""),
    fee_bps: toNum(s.fee_bps),
    yes_pool: toNum(s.yes_pool),
    no_pool: toNum(s.no_pool),
    resolved: Boolean(s.resolved),
    resolution: String(s.resolution ?? ""),
    checklist: normChecklist(s.checklist),
    notes: String(s.notes ?? ""),
    creator: String(s.creator ?? ""),
    resolved_by: String(s.resolved_by ?? ""),
    fee_amount: toNum(s.fee_amount),
  };
}

function normPosition(v: unknown): PositionRecord {
  if (typeof v === "string") {
    try {
      return normPosition(JSON.parse(v));
    } catch {
      /* */
    }
  }
  const s = m2o(v);
  return {
    market_id: String(s.market_id ?? ""),
    trader: String(s.trader ?? ""),
    yes_amount: toNum(s.yes_amount),
    no_amount: toNum(s.no_amount),
    claimed: Boolean(s.claimed),
  };
}

function sortMarkets(m: MarketRecord[]) {
  return [...m].sort(
    (a, b) =>
      (Number(a.market_id.replace("market-", "")) || 0) -
      (Number(b.market_id.replace("market-", "")) || 0),
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}
function pct(yes: number, no: number) {
  const t = yes + no;
  return t > 0 ? Math.round((yes / t) * 100) : 50;
}
function shortHash(h: string) {
  return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "";
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function txStage(s: TxStatus) {
  if (s === "FAILED" || s === "CANCELED" || s === "UNDETERMINED") return -1;
  if (s === "FINALIZED") return 3;
  if (s === "ACCEPTED") return 2;
  if (["COMMITTING", "REVEALING", "PROPOSING", "PENDING"].includes(s))
    return 1;
  return 0;
}

/* ── Skeleton Loaders ────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-surface-1 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="skeleton mb-2 h-3 w-20" />
          <div className="skeleton mb-1 h-5 w-56" />
          <div className="skeleton h-5 w-40" />
        </div>
        <div className="skeleton h-7 w-16 rounded-full" />
      </div>
      <div className="mb-3 flex justify-between">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="skeleton mb-4 h-2 w-full rounded-full" />
      <div className="flex gap-6">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-3 w-24" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Tx Tracker ──────────────────────────────────────────── */

function TxTracker({
  tx,
  onCopy,
}: {
  tx: TxPanelState | null;
  onCopy: (h: string) => void;
}) {
  if (!tx) return null;
  const stage = txStage(tx.status);
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800/40 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-200">
          {tx.action}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase ${
            stage < 0
              ? "bg-crimson-dim text-crimson"
              : stage === 3
                ? "bg-neon-dim text-neon"
                : "bg-amber-dim text-amber"
          }`}
        >
          {tx.status}
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="mb-1 grid grid-cols-4 gap-1">
          {TX_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full ${
                stage < 0
                  ? i <= 1
                    ? "bg-crimson"
                    : "bg-zinc-800"
                  : i < stage
                    ? "bg-neon"
                    : i === stage
                      ? "bg-amber animate-pulse"
                      : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {TX_STEPS.map((l) => (
            <span key={l} className="text-center font-mono text-[10px] text-zinc-600">
              {l}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-800/40 px-4 py-3">
        {tx.hash && (
          <div className="mb-1 flex items-center gap-2">
            <code className="font-mono text-xs text-zinc-500">
              {shortHash(tx.hash)}
            </code>
            <button
              className="text-zinc-600 hover:text-cyan transition-colors"
              onClick={() => onCopy(tx.hash)}
              type="button"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
        <p className="font-mono text-xs text-zinc-500">{tx.message}</p>
        {tx.error && (
          <p className="mt-1 font-mono text-xs text-crimson">{tx.error}</p>
        )}
      </div>
    </div>
  );
}

/* ── Market Detail Modal ─────────────────────────────────── */

function MarketDetail({
  market,
  onClose,
}: {
  market: MarketRecord;
  onClose: () => void;
}) {
  const { address, client } = useWallet();
  const [amount, setAmount] = useState("100");
  const [traderAddr, setTraderAddr] = useState(address ?? "");
  const [position, setPosition] = useState<PositionRecord | null>(null);
  const [claimable, setClaimable] = useState(0);
  const [posLoading, setPosLoading] = useState(false);
  const [posError, setPosError] = useState("");
  const [txState, setTxState] = useState<TxPanelState | null>(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const autoLoaded = useRef(false);

  useEffect(() => {
    if (address) setTraderAddr(address);
  }, [address]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const sdkRead = useCallback(
    async (fn: string, args: unknown[]) => {
      for (let i = 0; i < 3; i++) {
        try {
          return await client.readContract({
            address: CONTRACT,
            functionName: fn,
            args: args as never,
          });
        } catch (e) {
          if (i === 2) throw e;
          await sleep(1500);
        }
      }
    },
    [client],
  );

  const loadPos = useCallback(
    async (addr?: string) => {
      const target = addr || traderAddr.trim();
      if (!target) return;
      setPosLoading(true);
      setPosError("");
      try {
        const [p, q] = await Promise.all([
          sdkRead("get_position", [market.market_id, target]),
          sdkRead("quote_claim", [market.market_id, target]),
        ]);
        setPosition(normPosition(p));
        setClaimable(toNum(q));
      } catch (e) {
        setPosError(e instanceof Error ? e.message : "Read failed");
        setPosition(null);
      } finally {
        setPosLoading(false);
      }
    },
    [market.market_id, sdkRead, traderAddr],
  );

  useEffect(() => {
    if (address && !autoLoaded.current) {
      autoLoaded.current = true;
      void loadPos(address);
    }
  }, [address, loadPos]);

  function doWrite(fn: string, args: unknown[], label: string) {
    if (!address) return;
    startTransition(async () => {
      let hash = "";
      setCopyMsg("");
      setTxState({
        action: label,
        hash: "",
        status: "PENDING",
        message: "Submitting...",
      });
      try {
        hash = await client.writeContract({
          address: CONTRACT,
          functionName: fn,
          args: args as never,
          value: BigInt(0),
        });
        setTxState({
          action: label,
          hash,
          status: "PENDING",
          message: "Waiting for validators...",
        });
        for (let i = 0; i < 40; i++) {
          const tx = await client.getTransaction({ hash: hash as never });
          const st = ((tx as Record<string, unknown>).status ??
            (tx as Record<string, unknown>).statusName ??
            "PENDING") as TxStatus;
          setTxState({ action: label, hash, status: st, message: `Status: ${st}` });
          if (
            ["FINALIZED", "FAILED", "CANCELED", "UNDETERMINED"].includes(st)
          ) {
            if (st !== "FINALIZED")
              setTxState({
                action: label,
                hash,
                status: st,
                message: `Ended: ${st}`,
                error: "Transaction did not finalize.",
              });
            break;
          }
          await sleep(3000);
        }
        if (traderAddr.trim()) await loadPos();
      } catch (e) {
        setTxState({
          action: label,
          hash,
          status: "FAILED",
          message: "Failed",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    });
  }

  function copyHash(h: string) {
    navigator.clipboard?.writeText(h).then(
      () => setCopyMsg("Copied!"),
      () => setCopyMsg("Copy failed"),
    );
    setTimeout(() => setCopyMsg(""), 2000);
  }

  const yPct = pct(market.yes_pool, market.no_pool);

  const evidenceLinks = [
    { label: "Product", icon: <Globe className="h-4 w-4" />, url: market.product_url },
    { label: "Docs", icon: <FileText className="h-4 w-4" />, url: market.docs_url },
    { label: "Repo", icon: <GitBranch className="h-4 w-4" />, url: market.repo_url },
    { label: "Chain", icon: <Link2 className="h-4 w-4" />, url: market.chain_url },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-surface-1"
      >
        {/* Header */}
        <div className="relative border-b border-zinc-800/40 px-6 pb-5 pt-6 md:px-8">
          <button
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-cyan">
            {market.project_name}
          </p>
          <h2 className="pr-10 text-xl font-bold leading-snug text-zinc-100 md:text-2xl">
            {market.question}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase ${
                !market.resolved
                  ? "bg-amber-dim text-amber"
                  : market.resolution === "YES"
                    ? "bg-neon-dim text-neon"
                    : "bg-crimson-dim text-crimson"
              }`}
            >
              {!market.resolved
                ? "Open"
                : market.resolution === "YES"
                  ? "Resolved YES"
                  : "Resolved NO"}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-600">
              <Clock className="h-3 w-3" />
              {market.deadline_text}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-8 p-6 md:flex-row md:p-8">
            {/* ── Left column ── */}
            <div className="min-w-0 flex-1 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "YES Pool", value: fmt(market.yes_pool), color: "text-neon" },
                  { label: "NO Pool", value: fmt(market.no_pool), color: "text-crimson" },
                  { label: "Total Volume", value: fmt(market.yes_pool + market.no_pool), color: "text-zinc-100" },
                  { label: "Fee", value: `${market.fee_bps} bps`, color: "text-zinc-300" },
                  { label: "Fee Collected", value: fmt(market.fee_amount), color: "text-zinc-300" },
                  { label: "Milestone", value: market.milestone_text, color: "text-zinc-300" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-surface-2 px-4 py-3">
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                      {s.label}
                    </span>
                    <span className={`mt-1 block text-sm font-bold ${s.color}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Probability bar */}
              <div>
                <div className="mb-2 flex justify-between font-mono text-xs font-bold">
                  <span className="text-neon">YES {yPct}%</span>
                  <span className="text-crimson">NO {100 - yPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-crimson/20">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-neon to-neon/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${yPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ minWidth: 4 }}
                  />
                </div>
              </div>

              {/* Evidence */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Shield className="h-4 w-4 text-cyan" /> Evidence Sources
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {evidenceLinks.map((ev) => (
                    <a
                      key={ev.label}
                      className="group flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-surface-2 px-3 py-2.5 transition-colors hover:border-zinc-700"
                      href={ev.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-dim text-cyan">
                        {ev.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-zinc-300">
                          {ev.label}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-zinc-600">
                          {ev.url || "(none)"}
                        </span>
                      </div>
                      <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Resolution checklist */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                  Resolution Checklist
                </h3>
                {market.resolved ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {CHECKLIST.map((c) => {
                        const pass = market.checklist[c.key];
                        return (
                          <div
                            key={c.key}
                            className="flex items-center gap-3 rounded-lg border border-zinc-800/40 bg-surface-2 px-3 py-2.5"
                          >
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                pass
                                  ? "bg-neon-dim text-neon"
                                  : "bg-crimson-dim text-crimson"
                              }`}
                            >
                              {pass ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <XIcon className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div>
                              <span className="block font-mono text-xs text-zinc-300">
                                {c.key}
                              </span>
                              <span className="block text-[11px] text-zinc-600">
                                {c.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {market.notes && (
                      <p className="mt-3 rounded-lg bg-surface-2 px-4 py-3 text-sm italic text-zinc-500">
                        {market.notes}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-5 text-center font-mono text-xs text-zinc-600">
                    Checklist results will appear after GenLayer resolves this
                    market.
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column: trade panel ── */}
            <div className="w-full shrink-0 space-y-4 md:w-[340px] md:sticky md:top-0 md:self-start">
              {/* Trade box */}
              <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-surface-2">
                <div className="border-b border-zinc-800/40 px-4 py-3">
                  <span className="text-sm font-bold text-zinc-200">Trade</span>
                </div>
                {!address ? (
                  <div className="px-4 py-6 text-center font-mono text-xs text-zinc-600">
                    Connect wallet to take positions.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 border-b border-zinc-800/40 px-4 py-3">
                      <span className="font-mono text-xs text-zinc-600">
                        Amount
                      </span>
                      <input
                        className="min-w-0 flex-1 bg-transparent text-right font-mono text-2xl font-bold text-zinc-100 outline-none placeholder:text-zinc-700"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        type="text"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="grid grid-cols-2">
                      <button
                        className="flex h-12 items-center justify-center gap-1.5 bg-neon font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={isPending || market.resolved}
                        onClick={() =>
                          doWrite(
                            "buy_yes",
                            [market.market_id, Number(amount)],
                            "Buy YES",
                          )
                        }
                        type="button"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>YES {yPct}%</>
                        )}
                      </button>
                      <button
                        className="flex h-12 items-center justify-center gap-1.5 bg-crimson font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={isPending || market.resolved}
                        onClick={() =>
                          doWrite(
                            "buy_no",
                            [market.market_id, Number(amount)],
                            "Buy NO",
                          )
                        }
                        type="button"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>NO {100 - yPct}%</>
                        )}
                      </button>
                    </div>
                    {(!market.resolved ||
                      (market.resolved && position)) && (
                      <div className="flex gap-2 border-t border-zinc-800/40 p-3">
                        {!market.resolved && (
                          <button
                            className="flex-1 rounded-lg bg-amber-dim py-2.5 font-mono text-xs font-bold text-amber transition-colors hover:bg-amber/20 disabled:opacity-30"
                            disabled={isPending}
                            onClick={() =>
                              doWrite(
                                "resolve_market",
                                [market.market_id],
                                "Resolve Market",
                              )
                            }
                            type="button"
                          >
                            Resolve
                          </button>
                        )}
                        {market.resolved && (
                          <button
                            className="flex-1 rounded-lg bg-cyan-dim py-2.5 font-mono text-xs font-bold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-30"
                            disabled={
                              isPending || Boolean(position?.claimed)
                            }
                            onClick={() =>
                              doWrite(
                                "claim",
                                [market.market_id],
                                "Claim Winnings",
                              )
                            }
                            type="button"
                          >
                            {position?.claimed ? "Claimed" : "Claim Winnings"}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tx tracker */}
              {copyMsg && (
                <div className="rounded-lg bg-cyan-dim px-4 py-2 font-mono text-xs text-cyan">
                  {copyMsg}
                </div>
              )}
              <TxTracker tx={txState} onCopy={copyHash} />

              {/* Position */}
              <div className="rounded-xl border border-zinc-800/60 bg-surface-2 p-4">
                <span className="mb-3 block text-sm font-bold text-zinc-200">
                  Your Position
                </span>
                {posLoading && (
                  <div className="flex items-center gap-2 py-3 font-mono text-xs text-zinc-600">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </div>
                )}
                {posError && (
                  <p className="font-mono text-xs text-crimson">{posError}</p>
                )}
                {position && !posLoading && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "YES", value: fmt(position.yes_amount), color: "text-neon" },
                      { label: "NO", value: fmt(position.no_amount), color: "text-crimson" },
                      { label: "Claimable", value: fmt(claimable), color: "text-zinc-100" },
                      { label: "Claimed", value: position.claimed ? "Yes" : "No", color: "text-zinc-400" },
                    ].map((p) => (
                      <div key={p.label} className="rounded-lg bg-surface-3 px-3 py-2 text-center">
                        <span className="block font-mono text-[10px] uppercase text-zinc-600">
                          {p.label}
                        </span>
                        <span className={`block font-mono text-sm font-bold ${p.color}`}>
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!position && !posLoading && !posError && address && (
                  <p className="mb-3 py-2 text-center font-mono text-xs text-zinc-600">
                    No position in this market yet.
                  </p>
                )}
                {!address && (
                  <p className="mb-3 py-2 text-center font-mono text-xs text-zinc-600">
                    Connect wallet to view position.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-surface-3 px-3 py-2 font-mono text-xs text-zinc-400 outline-none focus:border-cyan placeholder:text-zinc-700"
                    placeholder="Look up address..."
                    value={traderAddr}
                    onChange={(e) => setTraderAddr(e.target.value)}
                  />
                  <button
                    className="shrink-0 rounded-lg bg-surface-3 px-3 py-2 font-mono text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                    disabled={posLoading || isPending}
                    onClick={() => void loadPos()}
                    type="button"
                  >
                    {posLoading ? "..." : "Load"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Create Market Modal ─────────────────────────────────── */

function CreateMarketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { address, client } = useWallet();
  const [form, setForm] = useState({
    question: "",
    project_name: "",
    milestone_text: "",
    deadline_text: "",
    product_url: "",
    docs_url: "",
    repo_url: "",
    chain_url: "",
    fee_bps: "200",
  });
  const [txState, setTxState] = useState<TxPanelState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!address) return;
    const {
      question,
      project_name,
      milestone_text,
      deadline_text,
      product_url,
      docs_url,
      repo_url,
      chain_url,
      fee_bps,
    } = form;
    if (!question.trim() || !project_name.trim()) return;
    startTransition(async () => {
      let hash = "";
      setTxState({
        action: "Create Market",
        hash: "",
        status: "PENDING",
        message: "Submitting...",
      });
      try {
        hash = await client.writeContract({
          address: CONTRACT,
          functionName: "create_market",
          args: [
            question,
            project_name,
            milestone_text,
            deadline_text,
            product_url,
            docs_url,
            repo_url,
            chain_url,
            Number(fee_bps),
          ] as never,
          value: BigInt(0),
        });
        setTxState({
          action: "Create Market",
          hash,
          status: "PENDING",
          message: "Waiting for validators...",
        });
        for (let i = 0; i < 40; i++) {
          const tx = await client.getTransaction({ hash: hash as never });
          const st = ((tx as Record<string, unknown>).status ??
            (tx as Record<string, unknown>).statusName ??
            "PENDING") as TxStatus;
          setTxState({
            action: "Create Market",
            hash,
            status: st,
            message: `Status: ${st}`,
          });
          if (
            ["FINALIZED", "FAILED", "CANCELED", "UNDETERMINED"].includes(st)
          ) {
            if (st === "FINALIZED") {
              onCreated();
              setTimeout(onClose, 1500);
            } else {
              setTxState({
                action: "Create Market",
                hash,
                status: st,
                message: `Ended: ${st}`,
                error: "Transaction did not finalize.",
              });
            }
            break;
          }
          await sleep(3000);
        }
      } catch (e) {
        setTxState({
          action: "Create Market",
          hash,
          status: "FAILED",
          message: "Failed",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    });
  }

  const fields: Array<{
    key: string;
    label: string;
    placeholder: string;
    full?: boolean;
  }> = [
    {
      key: "question",
      label: "Market Question",
      placeholder: "Will [project] ship [feature] by [date]?",
      full: true,
    },
    { key: "project_name", label: "Project", placeholder: "e.g. Ethereum" },
    {
      key: "milestone_text",
      label: "Milestone",
      placeholder: "e.g. Ship EIP-4844",
    },
    { key: "deadline_text", label: "Deadline", placeholder: "e.g. Q2 2025" },
    { key: "fee_bps", label: "Fee (bps)", placeholder: "200" },
    {
      key: "product_url",
      label: "Product URL",
      placeholder: "https://...",
      full: true,
    },
    {
      key: "docs_url",
      label: "Docs URL",
      placeholder: "https://...",
      full: true,
    },
    {
      key: "repo_url",
      label: "Repo URL",
      placeholder: "https://github.com/...",
      full: true,
    },
    {
      key: "chain_url",
      label: "Chain URL",
      placeholder: "https://etherscan.io/...",
      full: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-surface-1"
      >
        <div className="relative border-b border-zinc-800/40 px-6 pb-4 pt-6">
          <button
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-zinc-100">Create Market</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Define a prediction market around a real roadmap milestone.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!address ? (
            <div className="py-8 text-center font-mono text-sm text-zinc-600">
              Connect your wallet to create a market.
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className={f.full ? "col-span-2" : ""}
                  >
                    <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      {f.label}
                    </label>
                    <input
                      className="h-11 w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-neon/40 placeholder:text-zinc-700"
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      type="text"
                    />
                  </div>
                ))}
              </div>
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-neon font-bold text-black transition-all hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={
                  isPending ||
                  !form.question.trim() ||
                  !form.project_name.trim()
                }
                onClick={submit}
                type="button"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Market"
                )}
              </button>
            </>
          )}
          {txState && (
            <div className="mt-4">
              <TxTracker
                tx={txState}
                onCopy={(h) => navigator.clipboard?.writeText(h)}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Market Card ─────────────────────────────────────────── */

function MarketCard({
  market,
  isSelected,
  onClick,
}: {
  market: MarketRecord;
  isSelected: boolean;
  onClick: () => void;
}) {
  const yP = pct(market.yes_pool, market.no_pool);
  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border bg-surface-1 p-5 transition-all ${
        isSelected
          ? "border-cyan shadow-[0_0_0_1px_var(--color-cyan),0_0_24px_rgba(6,182,212,0.1)]"
          : "border-zinc-800/60 hover:border-zinc-700/60"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan">
            {market.project_name}
          </p>
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-100 group-hover:text-white">
            {market.question}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
            !market.resolved
              ? "bg-amber-dim text-amber"
              : market.resolution === "YES"
                ? "bg-neon-dim text-neon"
                : "bg-crimson-dim text-crimson"
          }`}
        >
          {!market.resolved
            ? "Open"
            : market.resolution === "YES"
              ? "YES"
              : "NO"}
        </span>
      </div>

      {/* Prob bar */}
      <div className="mb-3">
        <div className="mb-1.5 flex justify-between font-mono text-[11px] font-bold">
          <span className="text-neon">YES {yP}%</span>
          <span className="text-crimson">NO {100 - yP}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-crimson/15">
          <div
            className="h-full rounded-full bg-neon transition-all duration-500"
            style={{ width: `${yP}%`, minWidth: 3 }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-5 font-mono text-[11px] text-zinc-600">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {market.deadline_text}
        </span>
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" /> {fmt(market.yes_pool + market.no_pool)}
        </span>
      </div>

      {/* Mini checklist */}
      {market.resolved && (
        <div className="mt-3 flex gap-1.5">
          {CHECKLIST.map((c) => (
            <span
              key={c.key}
              className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${
                market.checklist[c.key]
                  ? "bg-neon-dim text-neon"
                  : "bg-crimson-dim text-crimson"
              }`}
              title={c.key}
            >
              {market.checklist[c.key] ? "\u2713" : "\u2717"}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Export: MarketBoard ────────────────────────────── */

export function MarketBoard() {
  const { client } = useWallet();
  const [markets, setMarkets] = useState<MarketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MarketRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        try {
          const res = await client.readContract({
            address: CONTRACT,
            functionName: "get_market_ids",
            args: [],
          });
          if (res instanceof Map) ids = Array.from(res.values()).map(String);
          else if (Array.isArray(res)) ids = res.map(String);
          else if (typeof res === "string") {
            try {
              const p = JSON.parse(res);
              if (Array.isArray(p)) ids = p.map(String);
            } catch {}
          }
          break;
        } catch {
          if (i === 2) throw new Error("Failed to load market list");
          await sleep(1500);
        }
      }
      const all = await Promise.all(
        ids.map(async (id) => {
          for (let i = 0; i < 3; i++) {
            try {
              return normMarket(
                await client.readContract({
                  address: CONTRACT,
                  functionName: "get_market",
                  args: [id],
                }),
              );
            } catch {
              if (i === 2) throw new Error(`Failed to load ${id}`);
              await sleep(1500);
            }
          }
          throw new Error("unreachable");
        }),
      );
      setMarkets(sortMarkets(all));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setShowCreate(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totalPool = markets.reduce(
    (s, m) => s + m.yes_pool + m.no_pool,
    0,
  );
  const resolvedCount = markets.filter((m) => m.resolved).length;

  return (
    <>
      {/* Stats bar */}
      {markets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-800/40 md:grid-cols-4"
        >
          {[
            { label: "Markets", value: String(markets.length), icon: <TrendingUp className="h-4 w-4 text-cyan" /> },
            { label: "Total Volume", value: fmt(totalPool), icon: <BarChart3 className="h-4 w-4 text-neon" /> },
            { label: "Resolved", value: String(resolvedCount), icon: <Check className="h-4 w-4 text-neon" /> },
            { label: "Active", value: String(markets.length - resolvedCount), icon: <Clock className="h-4 w-4 text-amber" /> },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 bg-surface-1 px-5 py-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
                {s.icon}
              </div>
              <div>
                <span className="block font-mono text-lg font-bold text-zinc-100">
                  {s.value}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Section header */}
      <div className="mb-6 flex items-end justify-between" id="markets">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Markets
          </h2>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            {loading
              ? "Loading live state..."
              : `${markets.length} markets on GenLayer Studio`}
          </p>
        </div>
        <button
          className="flex h-9 items-center gap-1.5 rounded-lg border border-neon/20 bg-neon/5 px-4 font-mono text-xs font-semibold text-neon transition-all hover:bg-neon/10 hover:border-neon/30"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          + Create
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-crimson/20 bg-crimson-dim px-4 py-3 font-mono text-sm text-crimson">
          {error}
        </div>
      )}

      {/* Grid or skeletons */}
      {loading ? (
        <SkeletonGrid />
      ) : markets.length === 0 && !error ? (
        <div className="py-16 text-center font-mono text-sm text-zinc-600">
          No markets found on this contract.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markets.map((m) => (
            <MarketCard
              key={m.market_id}
              market={m}
              isSelected={selected?.market_id === m.market_id}
              onClick={() => setSelected(m)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selected && (
          <MarketDetail
            key={selected.market_id}
            market={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreateMarketModal
            onClose={() => setShowCreate(false)}
            onCreated={() => void refresh()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
