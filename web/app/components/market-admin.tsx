"use client";

import { useEffect, useState, useTransition } from "react";
import { useWallet } from "../../lib/wallet-context";
import { WalletButton } from "./wallet-button";

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

type PositionState = {
  record: PositionRecord;
  claimable: number;
};

type TxPanelState = {
  action: string;
  hash: string;
  status: TxStatus;
  message: string;
  result?: string;
  rounds?: string;
  error?: string;
};

const checklistLabels: Array<{ key: keyof Checklist; title: string; description: string }> = [
  {
    key: "product_live",
    title: "product_live",
    description: "Public product surface is live"
  },
  {
    key: "feature_usable",
    title: "feature_usable",
    description: "Promised feature appears usable"
  },
  {
    key: "docs_or_changelog_live",
    title: "docs_or_changelog_live",
    description: "Docs or changelog are public"
  },
  {
    key: "repo_or_chain_evidence",
    title: "repo_or_chain_evidence",
    description: "Repo or chain evidence supports delivery"
  }
];

const txPhases = ["Submitted", "Proposing", "Accepted", "Finalized"];

const contractAddress = (
  process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mapToObject(value: unknown): Record<string, unknown> {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) {
      obj[String(k)] = v instanceof Map ? mapToObject(v) : v;
    }
    return obj;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeChecklist(value: unknown): Checklist {
  const source = mapToObject(value);
  return {
    product_live: Boolean(source.product_live),
    feature_usable: Boolean(source.feature_usable),
    docs_or_changelog_live: Boolean(source.docs_or_changelog_live),
    repo_or_chain_evidence: Boolean(source.repo_or_chain_evidence)
  };
}

function normalizeMarket(value: unknown): MarketRecord {
  const source = mapToObject(value);
  // If the value was a JSON string from the contract, parse it
  if (typeof value === "string") {
    try {
      return normalizeMarket(JSON.parse(value));
    } catch {
      // not JSON, continue with empty
    }
  }
  return {
    market_id: String(source.market_id ?? ""),
    question: String(source.question ?? ""),
    project_name: String(source.project_name ?? ""),
    milestone_text: String(source.milestone_text ?? ""),
    deadline_text: String(source.deadline_text ?? ""),
    product_url: String(source.product_url ?? ""),
    docs_url: String(source.docs_url ?? ""),
    repo_url: String(source.repo_url ?? ""),
    chain_url: String(source.chain_url ?? ""),
    fee_bps: toNumber(source.fee_bps),
    yes_pool: toNumber(source.yes_pool),
    no_pool: toNumber(source.no_pool),
    resolved: Boolean(source.resolved),
    resolution: String(source.resolution ?? ""),
    checklist: normalizeChecklist(source.checklist),
    notes: String(source.notes ?? ""),
    creator: String(source.creator ?? ""),
    resolved_by: String(source.resolved_by ?? ""),
    fee_amount: toNumber(source.fee_amount)
  };
}

function normalizePosition(value: unknown): PositionRecord {
  const source = mapToObject(value);
  if (typeof value === "string") {
    try {
      return normalizePosition(JSON.parse(value));
    } catch {
      // not JSON
    }
  }
  return {
    market_id: String(source.market_id ?? ""),
    trader: String(source.trader ?? ""),
    yes_amount: toNumber(source.yes_amount),
    no_amount: toNumber(source.no_amount),
    claimed: Boolean(source.claimed)
  };
}

function sortMarkets(markets: MarketRecord[]) {
  return [...markets].sort((left, right) => {
    const leftValue = Number(left.market_id.replace("market-", "")) || 0;
    const rightValue = Number(right.market_id.replace("market-", "")) || 0;
    return leftValue - rightValue;
  });
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function marketStatusLabel(market: MarketRecord) {
  if (!market.resolved) return "Open";
  return market.resolution === "YES" ? "Resolved YES" : "Resolved NO";
}

function marketStatusTone(market: MarketRecord) {
  if (!market.resolved) return "pending";
  return market.resolution === "YES" ? "yes" : "no";
}

function trackerStage(status: TxStatus) {
  if (status === "FAILED" || status === "CANCELED" || status === "UNDETERMINED") return -1;
  if (status === "FINALIZED") return 3;
  if (status === "ACCEPTED") return 2;
  if (
    status === "COMMITTING" ||
    status === "REVEALING" ||
    status === "PROPOSING" ||
    status === "PENDING"
  )
    return 1;
  return 0;
}

function shortHash(value: string) {
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function ChecklistGrid({ checklist, compact = false }: { checklist: Checklist; compact?: boolean }) {
  return (
    <div className={compact ? "checklistMatrix compact" : "checklistMatrix"}>
      {checklistLabels.map((item) => {
        const passed = checklist[item.key];
        return (
          <div className={compact ? "checkCell compact" : "checkCell"} key={item.key}>
            <span className={passed ? "checkState yes" : "checkState no"}>
              {passed ? "PASS" : "MISS"}
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionTracker({
  tx,
  onCopy
}: {
  tx: TxPanelState | null;
  onCopy: (hash: string) => void;
}) {
  if (!tx) return null;

  const stage = trackerStage(tx.status);

  return (
    <section className="card txCard">
      <div className="sectionHeader">
        <div>
          <p className="cardLabel">Transaction</p>
          <h3>{tx.action}</h3>
        </div>
        <span className={`pill ${stage < 0 ? "no" : stage === 3 ? "yes" : "pending"}`}>
          {tx.status}
        </span>
      </div>

      <div className="trackerRow">
        {txPhases.map((label, index) => {
          const className =
            stage < 0
              ? index === 1
                ? "trackerStep failed"
                : "trackerStep"
              : index < stage
                ? "trackerStep done"
                : index === stage
                  ? "trackerStep active"
                  : "trackerStep";
          return (
            <div className={className} key={label}>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="txMeta">
        <span>Hash</span>
        <div className="hashRow">
          <code>{shortHash(tx.hash)}</code>
          <button className="smallButton" onClick={() => onCopy(tx.hash)} type="button">
            Copy
          </button>
        </div>
      </div>

      <p className="tiny txMessage">{tx.message}</p>
      {tx.result ? <p className="tiny">Result: {tx.result}</p> : null}
      {tx.rounds ? <p className="tiny">Rounds: {tx.rounds}</p> : null}
      {tx.error ? <p className="errorText">{tx.error}</p> : null}
    </section>
  );
}

export function MarketAdmin() {
  const { address, client } = useWallet();

  const [markets, setMarkets] = useState<MarketRecord[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [boardError, setBoardError] = useState("");
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [positionError, setPositionError] = useState("");
  const [positionState, setPositionState] = useState<PositionState | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(false);
  const [traderAddress, setTraderAddress] = useState("");
  const [amount, setAmount] = useState("100");
  const [txState, setTxState] = useState<TxPanelState | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-fill trader address when wallet connects
  useEffect(() => {
    if (address) {
      setTraderAddress(address);
    }
  }, [address]);

  async function sdkRead(functionName: string, args: unknown[]) {
    const result = await client.readContract({
      address: contractAddress,
      functionName,
      args: args as Parameters<typeof client.readContract>[0]["args"],
    });
    return result;
  }

  async function sdkReadWithRetry(functionName: string, args: unknown[], retries = 3, delayMs = 1500) {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        return await sdkRead(functionName, args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown read error");
        if (attempt < retries - 1) await sleep(delayMs);
      }
    }
    throw lastError || new Error("Read failed");
  }

  async function refreshMarkets() {
    setIsLoadingBoard(true);
    setBoardError("");
    try {
      const idsResult = await sdkReadWithRetry("get_market_ids", []);
      let ids: string[];
      if (idsResult instanceof Map) {
        ids = Array.from(idsResult.values()).map(String);
      } else if (Array.isArray(idsResult)) {
        ids = idsResult.map(String);
      } else if (typeof idsResult === "string") {
        try {
          const parsed = JSON.parse(idsResult);
          ids = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          ids = [];
        }
      } else {
        ids = [];
      }
      const nextMarkets = sortMarkets(
        await Promise.all(
          ids.map(async (marketId) => normalizeMarket(await sdkReadWithRetry("get_market", [marketId])))
        )
      );
      setMarkets(nextMarkets);
      setSelectedMarketId((current) => {
        if (current && nextMarkets.some((m) => m.market_id === current)) return current;
        return nextMarkets[0]?.market_id || "";
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      setBoardError(detail);
    } finally {
      setIsLoadingBoard(false);
    }
  }

  useEffect(() => {
    void refreshMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPositionState(null);
    setPositionError("");
  }, [selectedMarketId]);

  const selectedMarket = markets.find((m) => m.market_id === selectedMarketId) || null;

  function copyHash(hash: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyMessage("Clipboard is not available in this browser.");
      return;
    }
    void navigator.clipboard.writeText(hash).then(
      () => setCopyMessage("Transaction hash copied."),
      () => setCopyMessage("Could not copy the transaction hash.")
    );
  }

  async function loadPosition() {
    if (!selectedMarket || !traderAddress.trim()) {
      setPositionState(null);
      setPositionError("Enter a trader address to read position state.");
      return;
    }

    setIsLoadingPosition(true);
    setPositionError("");

    try {
      const [positionResult, quoteResult] = await Promise.all([
        sdkReadWithRetry("get_position", [selectedMarket.market_id, traderAddress.trim()]),
        sdkReadWithRetry("quote_claim", [selectedMarket.market_id, traderAddress.trim()])
      ]);
      setPositionState({
        record: normalizePosition(positionResult),
        claimable: toNumber(quoteResult)
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      setPositionState(null);
      setPositionError(detail);
    } finally {
      setIsLoadingPosition(false);
    }
  }

  function submitWrite(functionName: string, args: unknown[], actionLabel: string) {
    if (!address) return;

    startTransition(async () => {
      let submittedHash = "";
      setCopyMessage("");
      setTxState({
        action: actionLabel,
        hash: "",
        status: "PENDING",
        message: `Submitting ${actionLabel.toLowerCase()}...`
      });

      try {
        const txHash = await client.writeContract({
          address: contractAddress,
          functionName,
          args: args as Parameters<typeof client.writeContract>[0]["args"],
          value: BigInt(0),
        });
        submittedHash = txHash;
        setTxState({
          action: actionLabel,
          hash: txHash,
          status: "PENDING",
          message: "Submitted to GenLayer. Waiting for validator progress..."
        });

        // Poll for finalization
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const tx = await client.getTransaction({ hash: txHash });
          const status = (tx as unknown as Record<string, unknown>).status as TxStatus
            ?? (tx as unknown as Record<string, unknown>).statusName as TxStatus
            ?? "PENDING";

          setTxState({
            action: actionLabel,
            hash: txHash,
            status,
            message: `Current status: ${status}`
          });

          if (
            status === "FINALIZED" ||
            status === "FAILED" ||
            status === "CANCELED" ||
            status === "UNDETERMINED"
          ) {
            if (status !== "FINALIZED") {
              setTxState({
                action: actionLabel,
                hash: txHash,
                status,
                message: `Transaction ended in ${status}.`,
                error: `The transaction did not finalize successfully.`
              });
              return;
            }
            break;
          }

          await sleep(3000);
        }

        setTxState({
          action: actionLabel,
          hash: txHash,
          status: "FINALIZED",
          message: "Finalized on GenLayer."
        });

        await refreshMarkets();
        if (selectedMarketId && traderAddress.trim()) {
          await loadPosition();
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        setTxState({
          action: actionLabel,
          hash: submittedHash,
          status: "FAILED",
          message: "Write path failed.",
          error: detail
        });
      }
    });
  }

  return (
    <section className="sectionSpacing" id="market-board">
      <div className="sectionHeader sectionHeaderSpacious">
        <div>
          <p className="cardLabel">Live Market Board</p>
          <h2>Markets resolved by live public evidence</h2>
        </div>
        <div className="headerRight">
          <WalletButton />
          <div className="contractMeta">
            <span>Contract</span>
            <code>{shortHash(contractAddress)}</code>
          </div>
        </div>
      </div>

      <p className="sectionNote sectionIntro">
        Connect your wallet to take positions and claim winnings. Reads work without a wallet.
      </p>

      {boardError ? <div className="errorBanner">{boardError}</div> : null}
      {copyMessage ? <div className="infoBanner">{copyMessage}</div> : null}

      <div className="boardGrid">
        <section className="card marketBoardPanel">
          <div className="listHeader">
            <h3>Markets</h3>
            <span className="tiny">
              {isLoadingBoard ? "Refreshing..." : `${markets.length} live markets`}
            </span>
          </div>

          <div className="marketListBoard">
            {isLoadingBoard ? <div className="emptyState">Loading live market state...</div> : null}
            {!isLoadingBoard && !markets.length ? (
              <div className="emptyState">No live markets found.</div>
            ) : null}

            {markets.map((market) => (
              <button
                className={
                  market.market_id === selectedMarketId
                    ? "marketCardButton isSelected"
                    : "marketCardButton"
                }
                key={market.market_id}
                onClick={() => setSelectedMarketId(market.market_id)}
                type="button"
              >
                <div className="marketCardTop">
                  <div>
                    <p className="marketProject">{market.project_name}</p>
                    <h3>{market.question}</h3>
                  </div>
                  <span className={`pill ${marketStatusTone(market)}`}>
                    {marketStatusLabel(market)}
                  </span>
                </div>

                <div className="marketCardStats">
                  <div>
                    <span>Deadline</span>
                    <strong>{market.deadline_text}</strong>
                  </div>
                  <div>
                    <span>YES pool</span>
                    <strong>{formatCredits(market.yes_pool)}</strong>
                  </div>
                  <div>
                    <span>NO pool</span>
                    <strong>{formatCredits(market.no_pool)}</strong>
                  </div>
                </div>

                {market.resolved ? (
                  <ChecklistGrid checklist={market.checklist} compact />
                ) : (
                  <p className="tiny pendingCopy">
                    Open market. Resolution checklist will populate after settlement.
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="card detailPanel">
          {!selectedMarket ? (
            <div className="emptyState">Select a market to inspect live state and actions.</div>
          ) : (
            <>
              <div className="detailHeader">
                <div>
                  <p className="cardLabel">{selectedMarket.project_name}</p>
                  <h2>{selectedMarket.question}</h2>
                </div>
                <span className={`pill ${marketStatusTone(selectedMarket)}`}>
                  {marketStatusLabel(selectedMarket)}
                </span>
              </div>

              <div className="detailMetaGrid">
                <div className="metaStat">
                  <span>Milestone</span>
                  <strong>{selectedMarket.milestone_text}</strong>
                </div>
                <div className="metaStat">
                  <span>Deadline</span>
                  <strong>{selectedMarket.deadline_text}</strong>
                </div>
                <div className="metaStat">
                  <span>YES pool</span>
                  <strong>{formatCredits(selectedMarket.yes_pool)}</strong>
                </div>
                <div className="metaStat">
                  <span>NO pool</span>
                  <strong>{formatCredits(selectedMarket.no_pool)}</strong>
                </div>
                <div className="metaStat">
                  <span>Fee</span>
                  <strong>{selectedMarket.fee_bps} bps</strong>
                </div>
                <div className="metaStat">
                  <span>Fee amount</span>
                  <strong>{formatCredits(selectedMarket.fee_amount)}</strong>
                </div>
              </div>

              <section className="subsection">
                <div className="subsectionHeader">
                  <h3>Evidence URLs</h3>
                  <p className="tiny">
                    These are the live sources the contract reads at resolution time.
                  </p>
                </div>
                <div className="linkGrid">
                  <a
                    className="evidenceLink"
                    href={selectedMarket.product_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Product</span>
                    <strong>{selectedMarket.product_url}</strong>
                  </a>
                  <a
                    className="evidenceLink"
                    href={selectedMarket.docs_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Docs</span>
                    <strong>{selectedMarket.docs_url}</strong>
                  </a>
                  <a
                    className="evidenceLink"
                    href={selectedMarket.repo_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Repo</span>
                    <strong>{selectedMarket.repo_url}</strong>
                  </a>
                  <a
                    className="evidenceLink"
                    href={selectedMarket.chain_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Chain</span>
                    <strong>{selectedMarket.chain_url}</strong>
                  </a>
                </div>
              </section>

              <section className="subsection resolutionPanel">
                <div className="subsectionHeader">
                  <h3>Resolution checklist</h3>
                  <p className="tiny">
                    Validators compare exact booleans against the same evidence. This is the
                    differentiator, not a hidden implementation detail.
                  </p>
                </div>
                {selectedMarket.resolved ? (
                  <>
                    <ChecklistGrid checklist={selectedMarket.checklist} />
                    {selectedMarket.notes ? (
                      <p className="resolutionNotes">{selectedMarket.notes}</p>
                    ) : null}
                  </>
                ) : (
                  <div className="emptyState subtle">
                    Checklist results will appear here after GenLayer resolves the market.
                  </div>
                )}
              </section>

              <section className="subsection">
                <div className="subsectionHeader">
                  <h3>Trader position</h3>
                  <p className="tiny">
                    Read live balances and claimable payout for any address.
                  </p>
                </div>
                <div className="formRow">
                  <input
                    onChange={(event) => setTraderAddress(event.target.value)}
                    placeholder="0x..."
                    value={traderAddress}
                  />
                  <button
                    className="secondaryButton"
                    disabled={isLoadingPosition || isPending}
                    onClick={() => void loadPosition()}
                    type="button"
                  >
                    {isLoadingPosition ? "Loading..." : "Load position"}
                  </button>
                </div>

                {positionError ? <p className="errorText">{positionError}</p> : null}
                {positionState ? (
                  <div className="positionGrid">
                    <div className="metaStat">
                      <span>YES balance</span>
                      <strong>{formatCredits(positionState.record.yes_amount)}</strong>
                    </div>
                    <div className="metaStat">
                      <span>NO balance</span>
                      <strong>{formatCredits(positionState.record.no_amount)}</strong>
                    </div>
                    <div className="metaStat">
                      <span>Claimable</span>
                      <strong>{formatCredits(positionState.claimable)}</strong>
                    </div>
                    <div className="metaStat">
                      <span>Claimed</span>
                      <strong>{positionState.record.claimed ? "true" : "false"}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="emptyState subtle">No position loaded yet.</div>
                )}
              </section>

              <section className="subsection">
                <div className="subsectionHeader">
                  <h3>Market actions</h3>
                  <p className="tiny">
                    {address
                      ? "Sign transactions directly with your wallet."
                      : "Connect your wallet to take actions."}
                  </p>
                </div>
                {!address ? (
                  <div className="emptyState subtle">
                    Connect your wallet above to buy positions, resolve markets, or claim winnings.
                  </div>
                ) : (
                  <div className="actionControls">
                    <div className="formRow">
                      <input
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Amount"
                        value={amount}
                      />
                    </div>
                    <div className="buttonRow">
                      <button
                        className="positiveButton"
                        disabled={isPending}
                        onClick={() =>
                          submitWrite(
                            "buy_yes",
                            [selectedMarket.market_id, Number(amount)],
                            "Buy YES"
                          )
                        }
                        type="button"
                      >
                        {isPending ? "Working..." : "Buy YES"}
                      </button>
                      <button
                        className="dangerButton"
                        disabled={isPending}
                        onClick={() =>
                          submitWrite(
                            "buy_no",
                            [selectedMarket.market_id, Number(amount)],
                            "Buy NO"
                          )
                        }
                        type="button"
                      >
                        {isPending ? "Working..." : "Buy NO"}
                      </button>
                      {!selectedMarket.resolved ? (
                        <button
                          className="warnButton"
                          disabled={isPending}
                          onClick={() =>
                            submitWrite(
                              "resolve_market",
                              [selectedMarket.market_id],
                              "Resolve Market"
                            )
                          }
                          type="button"
                        >
                          {isPending ? "Working..." : "Resolve"}
                        </button>
                      ) : null}
                      {selectedMarket.resolved ? (
                        <button
                          className="secondaryButton"
                          disabled={isPending || Boolean(positionState?.record.claimed)}
                          onClick={() =>
                            submitWrite("claim", [selectedMarket.market_id], "Claim Winnings")
                          }
                          type="button"
                        >
                          {positionState?.record.claimed
                            ? "Already claimed"
                            : isPending
                              ? "Working..."
                              : "Claim"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </section>

              <TransactionTracker onCopy={copyHash} tx={txState} />
            </>
          )}
        </section>
      </div>
    </section>
  );
}
