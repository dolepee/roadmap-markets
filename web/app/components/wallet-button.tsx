"use client";

import { useWallet } from "../../lib/wallet-context";
import { Wallet, Power } from "lucide-react";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-1 pl-3.5 h-10 dark:border-zinc-800 dark:bg-surface-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50 dark:bg-neon" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-neon" />
        </span>
        <span className="font-mono text-xs font-medium text-zinc-500 dark:text-zinc-400">{shortAddr(address)}</span>
        <button
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          onClick={disconnect}
          type="button"
        >
          <Power className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neon/20 dark:bg-neon/5 dark:text-neon dark:hover:bg-neon/10 dark:hover:border-neon/40 dark:hover:shadow-[0_0_20px_rgba(57,255,20,0.15)]"
        disabled={isConnecting}
        onClick={() => void connect()}
        type="button"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="text-xs text-rose-600 dark:text-crimson">{error}</p>}
    </div>
  );
}
