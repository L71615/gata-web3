import type { MarketSnapshot, TokenCandidate } from "../domain.js";

interface Profile {
  chainId?: string;
  tokenAddress?: string;
}

interface Pair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
}

interface PairResponse {
  pairs?: Pair[];
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`DexScreener request failed: ${response.status} ${url}`);
  return await response.json() as T;
}

function numberOrZero(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toCandidate(pair: Pair, nowMs: number): TokenCandidate | null {
  const base = pair.baseToken;
  if (pair.chainId !== "solana" || !base?.address || !pair.pairAddress) return null;
  const txns5m = pair.txns?.m5 ?? {};
  const priceChange = pair.priceChange ?? {};
  const market: MarketSnapshot = {
    priceUsd: numberOrZero(pair.priceUsd),
    liquidityUsd: numberOrZero(pair.liquidity?.usd),
    volume24hUsd: numberOrZero(pair.volume?.h24),
    buys5m: numberOrZero(txns5m.buys),
    sells5m: numberOrZero(txns5m.sells),
    buyers5m: numberOrZero(txns5m.buys),
    sellers5m: numberOrZero(txns5m.sells),
    priceChange5mPct: numberOrZero(priceChange.m5),
    priceChange1hPct: numberOrZero(priceChange.h1),
    pairCreatedAtMs: numberOrZero(pair.pairCreatedAt) || nowMs,
    observedAtMs: nowMs,
    dexId: pair.dexId ?? "unknown",
    pairAddress: pair.pairAddress,
    url: pair.url
  };
  return {
    chain: "solana",
    mint: base.address,
    symbol: base.symbol ?? "UNKNOWN",
    name: base.name ?? "Unknown token",
    market,
    discoveredAtMs: nowMs
  };
}

export class DexScreenerProvider {
  public constructor(private readonly baseUrl: string) {}

  public async discoverLatest(nowMs = Date.now()): Promise<TokenCandidate[]> {
    const profiles = await getJson<Profile[]>(`${this.baseUrl}/token-profiles/latest/v1`);
    const solanaProfiles = profiles.filter((profile) => profile.chainId === "solana" && profile.tokenAddress);
    const candidates: TokenCandidate[] = [];
    for (const profile of solanaProfiles.slice(0, 25)) {
      try {
        const response = await getJson<PairResponse | Pair[]>(`${this.baseUrl}/token-pairs/v1/solana/${profile.tokenAddress}`);
        const pairs = Array.isArray(response) ? response : (response.pairs ?? []);
        const best = pairs
          .filter((pair) => pair.chainId === "solana")
          .sort((a, b) => numberOrZero(b.liquidity?.usd) - numberOrZero(a.liquidity?.usd))[0];
        const candidate = best ? toCandidate(best, nowMs) : null;
        if (candidate) candidates.push(candidate);
      } catch {
        // One malformed/deleted pair must not stop the rest of the scan.
      }
    }
    return candidates;
  }
}
