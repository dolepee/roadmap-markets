import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WalletProvider } from "../lib/wallet-context";
import { ThemeProvider } from "./components/theme-provider";

export const metadata: Metadata = {
  title: "Roadmap Markets — Trade whether crypto teams actually ship",
  description:
    "Prediction markets for roadmap milestones. GenLayer resolves delivery from live public evidence — no oracles, no committees.",
  openGraph: {
    title: "Roadmap Markets",
    description:
      "Prediction markets for roadmap milestones. GenLayer resolves delivery deterministically.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <ThemeProvider>
          <WalletProvider>{children}</WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
