import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("configuration safety", () => {
  it("defaults to paper mode with live trading disabled", () => {
    const config = loadConfig({});
    expect(config.mode).toBe("paper");
    expect(config.liveTradingEnabled).toBe(false);
  });

  it("requires explicit acknowledgement and secrets for live mode", () => {
    expect(() => loadConfig({
      GATE_MODE: "live",
      LIVE_TRADING_ENABLED: "true",
      LIVE_TRADING_ACK: "wrong"
    })).toThrow(/WALLET_PRIVATE_KEY|JUPITER_API_KEY|LIVE_TRADING_ACK/);
  });
});
