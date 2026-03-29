"use client";

import { useWallet } from "../../lib/wallet-context";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="walletConnected">
        <span className="walletAddress">{shortAddress(address)}</span>
        <button className="smallButton" onClick={disconnect} type="button">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="walletConnect">
      <button
        className="connectButton"
        disabled={isConnecting}
        onClick={() => void connect()}
        type="button"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error ? <p className="errorText walletError">{error}</p> : null}
    </div>
  );
}
