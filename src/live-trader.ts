import type { AppConfig, RiskAssessment, TradeIntent } from "./domain.js";
import type { Ledger } from "./ledger.js";
import { JupiterExecutor } from "./adapters/jupiter.js";

export class LiveTradeCoordinator {
  private readonly executor: JupiterExecutor | null;

  public constructor(private readonly config: AppConfig, private readonly ledger: Ledger) {
    this.executor = config.liveTradingEnabled && config.jupiterApiKey && config.walletPrivateKey
      ? new JupiterExecutor(config.jupiterBaseUrl, config.jupiterApiKey, config.walletPrivateKey)
      : null;
  }

  public async executeIfAllowed(assessment: RiskAssessment): Promise<void> {
    if (!this.config.liveTradingEnabled || !this.executor) return;
    if (fs.existsSync(this.config.killSwitchFile)) {
      this.ledger.saveLiveAudit("LIVE_BLOCKED", { mint: assessment.candidate.mint, reason: "KILL_SWITCH" });
      return;
    }
    if (this.ledger.hasLiveTrade(assessment.candidate.mint)) {
      this.ledger.saveLiveAudit("LIVE_BLOCKED", { mint: assessment.candidate.mint, reason: "DUPLICATE_MINT" });
      return;
    }
    if (assessment.decision !== "LIVE_ELIGIBLE" || assessment.hardRejected || assessment.score < this.config.minScore) {
      this.ledger.saveLiveAudit("LIVE_BLOCKED", { mint: assessment.candidate.mint, decision: assessment.decision, reasons: assessment.reasons });
      return;
    }
    if (assessment.reasons.includes("INCOMPLETE_SECURITY_DATA") || assessment.reasons.includes("STALE_MARKET_DATA")) {
      this.ledger.saveLiveAudit("LIVE_BLOCKED", { mint: assessment.candidate.mint, reasons: assessment.reasons });
      return;
    }
    if (assessment.candidate.market.priceImpactBps !== undefined
      && assessment.candidate.market.priceImpactBps > this.config.maxPriceImpactBps) {
      this.ledger.saveLiveAudit("LIVE_BLOCKED", { mint: assessment.candidate.mint, reason: "HIGH_PRICE_IMPACT" });
      return;
    }
    const intent: TradeIntent = {
      mint: assessment.candidate.mint,
      symbol: assessment.candidate.symbol,
      inputMint: this.config.solanaQuoteMint,
      outputMint: assessment.candidate.mint,
      amountAtomic: this.config.livePositionAmountAtomic,
      maxSlippageBps: this.config.maxSlippageBps,
      reason: `score=${assessment.score}`
    };
    this.ledger.saveLiveAudit("LIVE_SUBMITTING", { intent, assessment });
    try {
      const result = await this.executor.execute(intent);
      this.ledger.saveLiveAudit("LIVE_RESULT", { intent, result });
      if (result.status === "Failed") throw new Error(result.error ?? "Jupiter returned Failed");
      this.ledger.markLiveTrade(intent.mint, result.signature, { intent, result });
    } catch (error) {
      this.ledger.saveLiveAudit("LIVE_FAILED", { intent, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
import fs from "node:fs";
