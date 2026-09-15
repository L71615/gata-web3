import { describe, expect, it } from "vitest";
import { assessCandidate } from "../src/risk-score.js";
import type { SecuritySnapshot, TokenCandidate, TradePolicy } from "../src/domain.js";

const policy: TradePolicy = {
  minLiquidityUsd: 10000,
  minScore: 75,
  maxSlippageBps: 300,
  maxPriceImpactBps: 500,
  maxPositionUsd: 25,
  maxDailyLossUsd: 25,
  maxOpenPositions: 2,
  maxTopHolderPercent: 35,
  takeProfitPercent: 30,
  stopLossPercent: 15
};

const candidate: TokenCandidate = {
  chain: "solana",
  mint: "11111111111111111111111111111111",
  symbol: "GATE",
  name: "Gate token",
  discoveredAtMs: 1000,
  market: {
    priceUsd: 1,
    liquidityUsd: 100000,
    volume24hUsd: 1000000,
    buys5m: 20,
    sells5m: 5,
    buyers5m: 20,
    sellers5m: 5,
    priceChange5mPct: 3,
    priceChange1hPct: 12,
    pairCreatedAtMs: 1000,
    observedAtMs: 1000,
    dexId: "raydium",
    pairAddress: "pair"
  }
};

const safe: SecuritySnapshot = {
  mintAuthorityActive: false,
  freezeAuthorityActive: false,
  tokenProgram: "legacy",
  riskyExtensions: [],
  topHolderPercent: 10,
  deployerSuspicious: false,
  sellSimulationOk: true,
  checkedAtMs: 1000
};

describe("risk scoring", () => {
  it("rejects active mint authority as a hard gate", () => {
    const result = assessCandidate(candidate, { ...safe, mintAuthorityActive: true }, policy, 1000);
    expect(result.decision).toBe("REJECT");
    expect(result.hardRejected).toBe(true);
    expect(result.reasons).toContain("ACTIVE_MINT_AUTHORITY");
  });

  it("rejects failed sell simulation", () => {
    const result = assessCandidate(candidate, { ...safe, sellSimulationOk: false }, policy, 1000);
    expect(result.decision).toBe("REJECT");
    expect(result.reasons).toContain("SELL_SIMULATION_FAILED");
  });

  it("keeps incomplete security in alert-only mode", () => {
    const result = assessCandidate(candidate, { ...safe, sellSimulationOk: null, deployerSuspicious: null }, policy, 1000);
    expect(result.decision).toBe("ALERT");
  });
});
