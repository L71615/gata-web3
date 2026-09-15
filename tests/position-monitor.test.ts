import { describe, expect, it } from "vitest";
import { evaluatePosition } from "../src/position-monitor.js";
import type { PaperPosition, SecuritySnapshot } from "../src/domain.js";

const position: PaperPosition = {
  id: "p", mint: "m", symbol: "G", quantity: 1, entryPriceUsd: 10,
  currentPriceUsd: 10, investedUsd: 10, openedAtMs: 1, status: "OPEN"
};
const safe: SecuritySnapshot = {
  mintAuthorityActive: false, freezeAuthorityActive: false, tokenProgram: "legacy",
  riskyExtensions: [], topHolderPercent: 10, deployerSuspicious: false,
  sellSimulationOk: true, checkedAtMs: 1
};

describe("position monitor", () => {
  it("prioritizes emergency exit when liquidity collapses", () => {
    expect(evaluatePosition(position, 13, 100, 1000, safe, 30, 15)).toBe("EMERGENCY_SELL");
  });
  it("triggers take profit and stop loss", () => {
    expect(evaluatePosition(position, 13, 10000, 1000, safe, 30, 15)).toBe("TAKE_PROFIT");
    expect(evaluatePosition(position, 8, 10000, 1000, safe, 30, 15)).toBe("STOP_LOSS");
  });
});
