"use client";

import { WalletButton } from "./wallet-button";

export function Header() {
  return (
    <header className="header">
      <div className="container headerInner">
        <div className="logo">
          <span className="logoMark">RM</span>
          Roadmap Markets
        </div>
        <nav className="headerNav">
          <a className="navLink" href="#markets">
            Markets
          </a>
          <a className="navLink" href="#how-it-works">
            How It Works
          </a>
          <a className="navLink" href="#why-genlayer">
            Why GenLayer
          </a>
        </nav>
        <div className="headerRight">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
