import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WalletProvider } from "../lib/wallet-context";

export const metadata: Metadata = {
  title: "Roadmap Markets — Trade whether crypto teams actually ship",
  description:
    "Prediction markets for roadmap milestones. GenLayer resolves delivery from live public evidence.",
  openGraph: {
    title: "Roadmap Markets",
    description: "Trade whether crypto teams actually ship.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
