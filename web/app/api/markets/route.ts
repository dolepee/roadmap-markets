import { NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const DEFAULT_CONTRACT = "0xC8F8B0F33054002cb7C186de1C8F97e2Aa19b0D6" as const;
const configuredContract = process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS?.trim();
const CONTRACT = (/^0x[a-fA-F0-9]{40}$/.test(configuredContract ?? "")
  ? configuredContract
  : DEFAULT_CONTRACT) as `0x${string}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readWithRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(1000 + i * 750);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("GenLayer read failed");
}

export async function GET() {
  const client = createClient({ chain: studionet });

  try {
    const ids = await readWithRetry(async () => {
      const value = await client.readContract({
        address: CONTRACT,
        functionName: "get_market_ids",
        args: [],
      });
      return Array.isArray(value) ? value.map((item) => String(item)) : [];
    });

    const markets = [];
    for (const id of ids) {
      try {
        const market = await readWithRetry(() =>
          client.readContract({
            address: CONTRACT,
            functionName: "get_market",
            args: [id],
          }),
        );
        markets.push(market);
      } catch {
        // keep partial success behavior
      }
    }

    return NextResponse.json(
      {
        contract: CONTRACT,
        ids,
        markets,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load markets",
      },
      { status: 502 },
    );
  }
}
