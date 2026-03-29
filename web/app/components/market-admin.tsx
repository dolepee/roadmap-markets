"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

/* ── Checklist labels ─────────────────────────────────────── */

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
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function m2o(v: unknown): Record<string, unknown> {
  if (v instanceof Map) {
    const o: Record<string, unknown> = {};
    for (const [k, val] of v.entries()) o[String(k)] = val instanceof Map ? m2o(val) : val;
    return o;
  }
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
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
  if (typeof v === "string") { try { return normMarket(JSON.parse(v)); } catch { /* */ } }
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
  if (typeof v === "string") { try { return normPosition(JSON.parse(v)); } catch { /* */ } }
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
  return [...m].sort((a, b) =>
    (Number(a.market_id.replace("market-", "")) || 0) -
    (Number(b.market_id.replace("market-", "")) || 0)
  );
}

function fmt(n: number) { return new Intl.NumberFormat("en-US").format(n); }

function pct(yes: number, no: number) {
  const t = yes + no;
  return t > 0 ? Math.round((yes / t) * 100) : 50;
}

function shortHash(h: string) { return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : ""; }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function txStage(s: TxStatus) {
  if (s === "FAILED" || s === "CANCELED" || s === "UNDETERMINED") return -1;
  if (s === "FINALIZED") return 3;
  if (s === "ACCEPTED") return 2;
  if (["COMMITTING", "REVEALING", "PROPOSING", "PENDING"].includes(s)) return 1;
  return 0;
}

/* ── Sub-components ───────────────────────────────────────── */

function TxTracker({ tx, onCopy }: { tx: TxPanelState | null; onCopy: (h: string) => void }) {
  if (!tx) return null;
  const stage = txStage(tx.status);
  return (
    <div className="txTracker">
      <div className="txHeader">
        <span className="txAction">{tx.action}</span>
        <span className={`statusBadge ${stage < 0 ? "no" : stage === 3 ? "yes" : "open"}`}>
          {tx.status}
        </span>
      </div>
      <div className="txSteps">
        {TX_STEPS.map((_, i) => (
          <div
            key={i}
            className={`txStep ${
              stage < 0 ? (i <= 1 ? "failed" : "") : i < stage ? "done" : i === stage ? "active" : ""
            }`}
          />
        ))}
      </div>
      <div className="txLabels">
        {TX_STEPS.map((l) => <span key={l}>{l}</span>)}
      </div>
      <div className="txFooter">
        {tx.hash && (
          <div className="txHash">
            {shortHash(tx.hash)}
            <button className="txCopyBtn" onClick={() => onCopy(tx.hash)} type="button">Copy</button>
          </div>
        )}
        <p className="txMsg">{tx.message}</p>
        {tx.error && <p className="txError">{tx.error}</p>}
      </div>
    </div>
  );
}

/* ── Detail modal ─────────────────────────────────────────── */

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

  useEffect(() => { if (address) setTraderAddr(address); }, [address]);

  const sdkRead = useCallback(async (fn: string, args: unknown[]) => {
    for (let i = 0; i < 3; i++) {
      try {
        return await client.readContract({ address: CONTRACT, functionName: fn, args: args as never });
      } catch (e) {
        if (i === 2) throw e;
        await sleep(1500);
      }
    }
  }, [client]);

  async function loadPos() {
    if (!traderAddr.trim()) return;
    setPosLoading(true);
    setPosError("");
    try {
      const [p, q] = await Promise.all([
        sdkRead("get_position", [market.market_id, traderAddr.trim()]),
        sdkRead("quote_claim", [market.market_id, traderAddr.trim()]),
      ]);
      setPosition(normPosition(p));
      setClaimable(toNum(q));
    } catch (e) {
      setPosError(e instanceof Error ? e.message : "Read failed");
      setPosition(null);
    } finally {
      setPosLoading(false);
    }
  }

  function doWrite(fn: string, args: unknown[], label: string) {
    if (!address) return;
    startTransition(async () => {
      let hash = "";
      setCopyMsg("");
      setTxState({ action: label, hash: "", status: "PENDING", message: "Submitting..." });
      try {
        hash = await client.writeContract({
          address: CONTRACT,
          functionName: fn,
          args: args as never,
          value: BigInt(0),
        });
        setTxState({ action: label, hash, status: "PENDING", message: "Waiting for validators..." });

        for (let i = 0; i < 40; i++) {
          const tx = await client.getTransaction({ hash: hash as never });
          const st = ((tx as Record<string, unknown>).status ??
            (tx as Record<string, unknown>).statusName ?? "PENDING") as TxStatus;
          setTxState({ action: label, hash, status: st, message: `Status: ${st}` });
          if (["FINALIZED", "FAILED", "CANCELED", "UNDETERMINED"].includes(st)) {
            if (st !== "FINALIZED")
              setTxState({ action: label, hash, status: st, message: `Ended: ${st}`, error: "Transaction did not finalize." });
            break;
          }
          await sleep(3000);
        }

        // Refresh position after tx
        if (traderAddr.trim()) await loadPos();
      } catch (e) {
        setTxState({ action: label, hash, status: "FAILED", message: "Failed", error: e instanceof Error ? e.message : "Unknown error" });
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
    { label: "Product", icon: "P", url: market.product_url },
    { label: "Docs", icon: "D", url: market.docs_url },
    { label: "Repo", icon: "R", url: market.repo_url },
    { label: "Chain", icon: "C", url: market.chain_url },
  ];

  return (
    <div className="detailOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="detailSheet">
        <div className="detailHeader">
          <button className="detailClose" onClick={onClose} type="button">&#x2715;</button>
          <p className="detailProject">{market.project_name}</p>
          <h2 className="detailTitle">{market.question}</h2>
          <div className="detailStatusRow">
            <span className={`statusBadge ${!market.resolved ? "open" : market.resolution === "YES" ? "yes" : "no"}`}>
              {!market.resolved ? "Open" : market.resolution === "YES" ? "Resolved YES" : "Resolved NO"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Deadline: {market.deadline_text}
            </span>
          </div>
        </div>

        <div className="detailBody">
          {/* Pool stats */}
          <div className="metaGrid">
            <div className="metaCell">
              <span className="metaLabel">YES Pool</span>
              <span className="metaValue" style={{ color: "var(--green)" }}>{fmt(market.yes_pool)}</span>
            </div>
            <div className="metaCell">
              <span className="metaLabel">NO Pool</span>
              <span className="metaValue" style={{ color: "var(--red)" }}>{fmt(market.no_pool)}</span>
            </div>
            <div className="metaCell">
              <span className="metaLabel">Total Pool</span>
              <span className="metaValue">{fmt(market.yes_pool + market.no_pool)}</span>
            </div>
            <div className="metaCell">
              <span className="metaLabel">Fee</span>
              <span className="metaValue">{market.fee_bps} bps</span>
            </div>
            <div className="metaCell">
              <span className="metaLabel">Fee Collected</span>
              <span className="metaValue">{fmt(market.fee_amount)}</span>
            </div>
            <div className="metaCell">
              <span className="metaLabel">Milestone</span>
              <span className="metaValue" style={{ fontSize: 14 }}>{market.milestone_text}</span>
            </div>
          </div>

          {/* Probability bar */}
          <div className="probBar" style={{ marginBottom: 28 }}>
            <div className="probLabels">
              <span className="probYes">YES {yPct}%</span>
              <span className="probNo">NO {100 - yPct}%</span>
            </div>
            <div className="probTrack">
              <div className="probFill" style={{ width: `${yPct}%` }} />
            </div>
          </div>

          {/* Evidence */}
          <div className="evidenceSection">
            <p className="evidenceTitle">Evidence Sources</p>
            <div className="evidenceGrid">
              {evidenceLinks.map((ev) => (
                <a key={ev.label} className="evidenceLink" href={ev.url} target="_blank" rel="noreferrer">
                  <span className="evidenceIcon">{ev.icon}</span>
                  <span className="evidenceLinkText">
                    <span className="evidenceLinkLabel">{ev.label}</span>
                    <span className="evidenceLinkUrl">{ev.url || "(none)"}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Resolution checklist */}
          <div className="checkSection">
            <p className="checkTitle">Resolution Checklist</p>
            {market.resolved ? (
              <>
                <div className="checkGrid">
                  {CHECKLIST.map((c) => {
                    const pass = market.checklist[c.key];
                    return (
                      <div className="checkItem" key={c.key}>
                        <span className={`checkIcon ${pass ? "pass" : "fail"}`}>
                          {pass ? "\u2713" : "\u2717"}
                        </span>
                        <span>
                          <span className="checkField">{c.key}</span>
                          <span className="checkDesc">{c.label}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {market.notes && <p className="resNotes">{market.notes}</p>}
              </>
            ) : (
              <div className="checkPending">
                Checklist results will appear after GenLayer resolves this market.
              </div>
            )}
          </div>

          {/* Trading */}
          <div className="tradeSection">
            <p className="tradeTitle">Trade</p>
            {!address ? (
              <div className="noWalletMsg">Connect your wallet to take positions.</div>
            ) : (
              <div className="tradeBox">
                <div className="tradeInputRow">
                  <span className="tradeInputLabel">Amount</span>
                  <input
                    className="tradeInput"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    type="text"
                    inputMode="numeric"
                  />
                </div>
                <div className="tradeButtons">
                  <button
                    className="tradeBtn yes"
                    disabled={isPending || market.resolved}
                    onClick={() => doWrite("buy_yes", [market.market_id, Number(amount)], "Buy YES")}
                    type="button"
                  >
                    {isPending ? "..." : `Buy YES ${yPct}%`}
                  </button>
                  <button
                    className="tradeBtn no"
                    disabled={isPending || market.resolved}
                    onClick={() => doWrite("buy_no", [market.market_id, Number(amount)], "Buy NO")}
                    type="button"
                  >
                    {isPending ? "..." : `Buy NO ${100 - yPct}%`}
                  </button>
                </div>
                {(!market.resolved || (market.resolved && position)) && (
                  <div className="tradeActions">
                    {!market.resolved && (
                      <button
                        className="actionBtn resolve"
                        disabled={isPending}
                        onClick={() => doWrite("resolve_market", [market.market_id], "Resolve Market")}
                        type="button"
                      >
                        Resolve
                      </button>
                    )}
                    {market.resolved && (
                      <button
                        className="actionBtn claim"
                        disabled={isPending || Boolean(position?.claimed)}
                        onClick={() => doWrite("claim", [market.market_id], "Claim Winnings")}
                        type="button"
                      >
                        {position?.claimed ? "Claimed" : "Claim Winnings"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tx tracker */}
          {copyMsg && <div className="infoBanner">{copyMsg}</div>}
          <TxTracker tx={txState} onCopy={copyHash} />

          {/* Position lookup */}
          <div className="posSection">
            <p className="posTitle">Position Lookup</p>
            <div className="posInputRow">
              <input
                className="posInput"
                placeholder="0x... trader address"
                value={traderAddr}
                onChange={(e) => setTraderAddr(e.target.value)}
              />
              <button
                className="posLoadBtn"
                disabled={posLoading || isPending}
                onClick={() => void loadPos()}
                type="button"
              >
                {posLoading ? "Loading..." : "Load"}
              </button>
            </div>
            {posError && <p className="errorText">{posError}</p>}
            {position && (
              <div className="posGrid">
                <div className="posCell">
                  <span className="posCellLabel">YES</span>
                  <span className="posCellValue" style={{ color: "var(--green)" }}>{fmt(position.yes_amount)}</span>
                </div>
                <div className="posCell">
                  <span className="posCellLabel">NO</span>
                  <span className="posCellValue" style={{ color: "var(--red)" }}>{fmt(position.no_amount)}</span>
                </div>
                <div className="posCell">
                  <span className="posCellLabel">Claimable</span>
                  <span className="posCellValue">{fmt(claimable)}</span>
                </div>
                <div className="posCell">
                  <span className="posCellLabel">Claimed</span>
                  <span className="posCellValue">{position.claimed ? "Yes" : "No"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────── */

export function MarketBoard() {
  const { client } = useWallet();
  const [markets, setMarkets] = useState<MarketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MarketRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        try {
          const res = await client.readContract({ address: CONTRACT, functionName: "get_market_ids", args: [] });
          if (res instanceof Map) ids = Array.from(res.values()).map(String);
          else if (Array.isArray(res)) ids = res.map(String);
          else if (typeof res === "string") { try { const p = JSON.parse(res); if (Array.isArray(p)) ids = p.map(String); } catch {} }
          break;
        } catch { if (i === 2) throw new Error("Failed to load market list"); await sleep(1500); }
      }

      const all = await Promise.all(
        ids.map(async (id) => {
          for (let i = 0; i < 3; i++) {
            try {
              return normMarket(await client.readContract({ address: CONTRACT, functionName: "get_market", args: [id] }));
            } catch { if (i === 2) throw new Error(`Failed to load ${id}`); await sleep(1500); }
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

  useEffect(() => { void refresh(); }, [refresh]);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Summary stats
  const totalPool = markets.reduce((s, m) => s + m.yes_pool + m.no_pool, 0);
  const resolvedCount = markets.filter((m) => m.resolved).length;

  return (
    <>
      {/* Stats bar */}
      {markets.length > 0 && (
        <div className="statsBar">
          <div className="statCell">
            <span className="statValue">{markets.length}</span>
            <span className="statLabel">Markets</span>
          </div>
          <div className="statCell">
            <span className="statValue">{fmt(totalPool)}</span>
            <span className="statLabel">Total Volume</span>
          </div>
          <div className="statCell">
            <span className="statValue">{resolvedCount}</span>
            <span className="statLabel">Resolved</span>
          </div>
          <div className="statCell">
            <span className="statValue">{markets.length - resolvedCount}</span>
            <span className="statLabel">Active</span>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="sectionHead" id="markets">
        <div>
          <h2 className="sectionTitle">Markets</h2>
          <p className="sectionSub">
            {loading ? "Loading live state..." : `${markets.length} markets on GenLayer Studio`}
          </p>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {/* Grid */}
      {loading && <div className="emptyState">Loading markets from contract...</div>}

      {!loading && markets.length === 0 && !error && (
        <div className="emptyState">No markets found on this contract.</div>
      )}

      <div className="marketGrid">
        {markets.map((m) => {
          const yP = pct(m.yes_pool, m.no_pool);
          return (
            <div
              className={`mCard ${selected?.market_id === m.market_id ? "selected" : ""}`}
              key={m.market_id}
              onClick={() => setSelected(m)}
            >
              <div className="mCardTop">
                <div>
                  <p className="mCardProject">{m.project_name}</p>
                  <h3 className="mCardQuestion">{m.question}</h3>
                </div>
                <span
                  className={`statusBadge ${!m.resolved ? "open" : m.resolution === "YES" ? "yes" : "no"}`}
                >
                  {!m.resolved ? "Open" : m.resolution === "YES" ? "YES" : "NO"}
                </span>
              </div>

              <div className="probBar">
                <div className="probLabels">
                  <span className="probYes">YES {yP}%</span>
                  <span className="probNo">NO {100 - yP}%</span>
                </div>
                <div className="probTrack">
                  <div className="probFill" style={{ width: `${yP}%` }} />
                </div>
              </div>

              <div className="mCardMeta">
                <span>Deadline: <strong>{m.deadline_text}</strong></span>
                <span>Pool: <strong>{fmt(m.yes_pool + m.no_pool)}</strong></span>
              </div>

              {m.resolved && (
                <div className="miniChecklist">
                  {CHECKLIST.map((c) => (
                    <span
                      key={c.key}
                      className={`miniCheck ${m.checklist[c.key] ? "pass" : "fail"}`}
                      title={c.key}
                    >
                      {m.checklist[c.key] ? "\u2713" : "\u2717"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <MarketDetail
          key={selected.market_id}
          market={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
