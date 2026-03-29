import "server-only";

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

type TxStatus =
  | "PENDING"
  | "CANCELED"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "FINALIZED"
  | "UNDETERMINED"
  | "FAILED";

type ContractAddress = `0x${string}` & { length: 42 };

type RpcTransaction = {
  hash?: string;
  status?: TxStatus;
  result_name?: string;
  num_of_rounds?: string;
};

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd(), "..");
const runtimeEnvPath = path.join(repoRoot, "runtime", "studionet.env");
const endpoint = process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio.genlayer.com/api";
const contractAddress = (
  process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS || "0x0000000000000000000000000000000000000000"
) as ContractAddress;

const createScriptPath = path.join(repoRoot, "scripts", "write_create_market.sh");
const buyYesScriptPath = path.join(repoRoot, "scripts", "write_buy_yes.sh");
const buyNoScriptPath = path.join(repoRoot, "scripts", "write_buy_no.sh");
const resolveScriptPath = path.join(repoRoot, "scripts", "write_resolve_market.sh");
const claimScriptPath = path.join(repoRoot, "scripts", "write_claim.sh");
const marketIdsScriptPath = path.join(repoRoot, "scripts", "call_get_market_ids.sh");
const marketScriptPath = path.join(repoRoot, "scripts", "call_get_market.sh");
const positionScriptPath = path.join(repoRoot, "scripts", "call_get_position.sh");
const quoteClaimScriptPath = path.join(repoRoot, "scripts", "call_quote_claim.sh");

function ensureConfiguredAddress() {
  if (contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS is not configured");
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function runBash(command: string) {
  const result = await execFileAsync("/bin/bash", ["-lc", command], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function extractLastTxHash(output: string) {
  const matches = output.match(/0x[a-fA-F0-9]{64}/g);
  if (!matches?.length) {
    throw new Error(`Could not find transaction hash in output:\n${output}`);
  }
  return matches[matches.length - 1];
}

function extractJsonValue(output: string) {
  const resultMatch = output.match(/Result:\s*\n([\s\S]*?)(?:\n\s*\n|$)/);
  const fallbackCandidate = output
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        (/^\{.*\}$/.test(line) ||
          /^\[.*\]$/.test(line) ||
          /^-?\d+$/.test(line) ||
          /^".*"$/.test(line)) &&
        !line.startsWith("[genlayer-js]")
    );
  const candidate = (resultMatch ? resultMatch[1] : fallbackCandidate || output).trim();
  if (!candidate) {
    throw new Error(`Could not parse contract read output:\n${output}`);
  }

  const normalizedCandidate =
    candidate.startsWith("[") && candidate.includes("'")
      ? candidate.replace(/'([^']*)'/g, (_, value: string) => JSON.stringify(value))
      : candidate;

  try {
    const parsed = JSON.parse(normalizedCandidate) as unknown;
    if (typeof parsed === "string") {
      const trimmed = parsed.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        return JSON.parse(trimmed) as unknown;
      }
    }
    return parsed;
  } catch {
    if (/^-?\d+$/.test(normalizedCandidate)) {
      return normalizedCandidate;
    }
    if (
      (normalizedCandidate.startsWith("{") && normalizedCandidate.endsWith("}")) ||
      (normalizedCandidate.startsWith("[") && normalizedCandidate.endsWith("]"))
    ) {
      return JSON.parse(normalizedCandidate) as unknown;
    }
    return normalizedCandidate;
  }
}

function buildStudioCurlArgs(hash: string) {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionByHash",
    params: [hash]
  });

  return ["-s", endpoint, "-H", "content-type: application/json", "--data", payload];
}

export function createRoadmapMarketClient() {
  return {
    endpoint,
    contractAddress
  };
}

export async function readMarket(functionName: string, args: unknown[] = []) {
  ensureConfiguredAddress();

  const commandBase = [
    "set -a",
    `source ${shellQuote(runtimeEnvPath)}`,
    "set +a"
  ];

  let command = "";
  if (functionName === "get_market_ids") {
    command = shellQuote(marketIdsScriptPath);
  } else if (functionName === "get_market") {
    command = `${shellQuote(marketScriptPath)} ${JSON.stringify(String(args[0] || ""))}`;
  } else if (functionName === "get_position") {
    command = `${shellQuote(positionScriptPath)} ${JSON.stringify(String(args[0] || ""))} ${JSON.stringify(String(args[1] || ""))}`;
  } else if (functionName === "quote_claim") {
    command = `${shellQuote(quoteClaimScriptPath)} ${JSON.stringify(String(args[0] || ""))} ${JSON.stringify(String(args[1] || ""))}`;
  } else {
    throw new Error(`Unsupported read function: ${functionName}`);
  }

  const output = await runBash([...commandBase, command].join(" && "));
  return extractJsonValue(output);
}

export async function writeMarket(functionName: string, args: unknown[] = []) {
  ensureConfiguredAddress();

  const commandBase = [
    "set -a",
    `source ${shellQuote(runtimeEnvPath)}`,
    "set +a"
  ];

  let command = "";
  if (functionName === "create_market") {
    const [
      question = "",
      projectName = "",
      milestoneText = "",
      deadlineText = "",
      productUrl = "",
      docsUrl = "",
      repoUrl = "",
      chainUrl = "",
      feeBps = 250
    ] = args;
    command = `${shellQuote(createScriptPath)} ${JSON.stringify(String(question))} ${JSON.stringify(String(projectName))} ${JSON.stringify(String(milestoneText))} ${JSON.stringify(String(deadlineText))} ${JSON.stringify(String(productUrl))} ${JSON.stringify(String(docsUrl))} ${JSON.stringify(String(repoUrl))} ${JSON.stringify(String(chainUrl))} ${JSON.stringify(Number(feeBps))}`;
  } else if (functionName === "buy_yes") {
    command = `${shellQuote(buyYesScriptPath)} ${JSON.stringify(String(args[0] || ""))} ${JSON.stringify(Number(args[1] || 0))}`;
  } else if (functionName === "buy_no") {
    command = `${shellQuote(buyNoScriptPath)} ${JSON.stringify(String(args[0] || ""))} ${JSON.stringify(Number(args[1] || 0))}`;
  } else if (functionName === "resolve_market") {
    command = `${shellQuote(resolveScriptPath)} ${JSON.stringify(String(args[0] || ""))}`;
  } else if (functionName === "claim") {
    command = `${shellQuote(claimScriptPath)} ${JSON.stringify(String(args[0] || ""))}`;
  } else {
    throw new Error(`Unsupported write function: ${functionName}`);
  }

  const output = await runBash([...commandBase, command].join(" && "));
  return extractLastTxHash(output);
}

export async function getMarketTransaction(hash: string) {
  const { stdout } = await execFileAsync("curl", buildStudioCurlArgs(hash), {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 4
  });
  const payload = JSON.parse(stdout) as { result?: RpcTransaction | null };
  if (!payload.result) {
    throw new Error(`Transaction not found: ${hash}`);
  }
  return {
    hash: payload.result.hash || hash,
    status: payload.result.status || "FAILED",
    result: payload.result.result_name || "",
    rounds: payload.result.num_of_rounds || "0"
  };
}
