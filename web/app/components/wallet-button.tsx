"use client";

import { useWallet } from "../../lib/wallet-context";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="walletConnected">
        <span className="walletDot" />
        <span className="walletAddr">{shortAddr(address)}</span>
        <button className="walletDisconnect" onClick={disconnect} type="button">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="connectBtn"
        disabled={isConnecting}
        onClick={() => void connect()}
        type="button"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error ? <p className="walletError">{error}</p> : null}
    </>
  );
}
