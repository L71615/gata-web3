import { describe, expect, it } from "vitest";
import { Ledger } from "../src/ledger.js";
import { PaperTrader } from "../src/paper-trader.js";
import type { TokenCandidate } from "../src/domain.js";

const candidate: TokenCandidate = {
  chain: "solana", mint: "mint", symbol: "G", name: "G",
  discoveredAtMs: 1000,
  market: {
    priceUsd: 2, liquidityUsd: 100000, volume24hUsd: 100000, buys5m: 10, sells5m: 2,
    buyers5m: 10, sellers5m: 2, priceChange5mPct: 1, priceChange1hPct: 2,
    pairCreatedAtMs: 1000, observedAtMs: 1000, dexId: "raydium", pairAddress: "pair"
  }
};

describe("paper trader", () => {
  it("opens and closes a paper position without network calls", () => {
    const ledger = new Ledger(":memory:");
    const trader = new PaperTrader(ledger);
    const position = trader.open(candidate, 10, 1000);
    expect(position.quantity).toBe(5);
    expect(trader.shouldClose(position, 2.7, 30, 15)).toBe(true);
    const closed = trader.close(position, 2.7, 2000);
    expect(closed.status).toBe("CLOSED");
    expect(closed.pnlUsd).toBeCloseTo(3.5);
    ledger.close();
  });
});
