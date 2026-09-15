import type { PaperPosition, TokenCandidate } from "./domain.js";
import type { Ledger } from "./ledger.js";

export class PaperTrader {
  public constructor(private readonly ledger: Ledger) {}

  public open(candidate: TokenCandidate, amountUsd: number, nowMs = Date.now()): PaperPosition {
    if (candidate.market.priceUsd <= 0) throw new Error("Cannot paper-trade a token with no valid price.");
    const position: PaperPosition = {
      id: `paper-${candidate.mint}-${candidate.market.pairAddress}-${nowMs}`,
      mint: candidate.mint,
      symbol: candidate.symbol,
      quantity: amountUsd / candidate.market.priceUsd,
      entryPriceUsd: candidate.market.priceUsd,
      currentPriceUsd: candidate.market.priceUsd,
      investedUsd: amountUsd,
      openedAtMs: nowMs,
      status: "OPEN"
    };
    this.ledger.savePaperPosition(position);
    this.ledger.saveAudit("PAPER_OPEN", position, nowMs);
    return position;
  }

  public close(position: PaperPosition, exitPriceUsd: number, nowMs = Date.now()): PaperPosition {
    const pnlUsd = (exitPriceUsd - position.entryPriceUsd) * position.quantity;
    const closed: PaperPosition = { ...position, currentPriceUsd: exitPriceUsd, exitPriceUsd, closedAtMs: nowMs, pnlUsd, status: "CLOSED" };
    this.ledger.savePaperPosition(closed);
    this.ledger.saveAudit("PAPER_CLOSE", closed, nowMs);
    return closed;
  }

  public shouldClose(position: PaperPosition, priceUsd: number, takeProfitPercent: number, stopLossPercent: number): boolean {
    const changePct = ((priceUsd - position.entryPriceUsd) / position.entryPriceUsd) * 100;
    return changePct >= takeProfitPercent || changePct <= -stopLossPercent;
  }
}
