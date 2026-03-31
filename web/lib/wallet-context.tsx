"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

type Address = `0x${string}`;

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

type GenlayerClient = ReturnType<typeof createClient>;

interface WalletState {
  address: Address | null;
  isConnecting: boolean;
  error: string;
  client: GenlayerClient;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const CHAIN_ID_HEX = "0x107D"; // 4221 (Bradbury)

const anonClient = createClient({ chain: testnetBradbury });

const WalletContext = createContext<WalletState>({
  address: null,
  isConnecting: false,
  error: "",
  client: anonClient,
  connect: async () => {},
  disconnect: () => {},
});

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

async function ensureGenLayerChain(provider: EthereumProvider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "GenLayer Bradbury Testnet",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: ["https://rpc-bradbury.genlayer.com"],
            blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const client = useMemo(() => {
    if (!address) return anonClient;
    return createClient({ chain: testnetBradbury, account: address });
  }, [address]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("MetaMask not detected. Install MetaMask to interact with markets.");
      return;
    }
    setIsConnecting(true);
    setError("");
    try {
      await ensureGenLayerChain(provider);
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts[0]) {
        setAddress(accounts[0] as Address);
        localStorage.setItem("rm_wallet_connected", "1");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem("rm_wallet_connected");
  }, []);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    if (localStorage.getItem("rm_wallet_connected") === "1") {
      provider
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const list = accounts as string[];
          if (list[0]) setAddress(list[0] as Address);
        })
        .catch(() => {});
    }

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(null);
        localStorage.removeItem("rm_wallet_connected");
      } else if (accounts[0]) {
        setAddress(accounts[0] as Address);
      }
    };

    const handleChainChanged = () => {
      // Refresh on chain change to re-init client
      window.location.reload();
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const value = useMemo(
    () => ({ address, isConnecting, error, client, connect, disconnect }),
    [address, isConnecting, error, client, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
