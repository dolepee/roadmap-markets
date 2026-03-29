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
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-surface-2 px-1 pl-3.5 h-10">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
        </span>
        <span className="font-mono text-xs font-medium text-zinc-400">{shortAddr(address)}</span>
        <button
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
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
        className="flex h-10 items-center gap-2 rounded-lg border border-neon/20 bg-neon/5 px-5 text-sm font-semibold text-neon transition-all hover:bg-neon/10 hover:border-neon/40 hover:shadow-[0_0_20px_rgba(57,255,20,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={isConnecting}
        onClick={() => void connect()}
        type="button"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="text-xs text-crimson">{error}</p>}
    </div>
  );
}
