import { Connection } from "@solana/web3.js";
import type { AppConfig, SecuritySnapshot, TokenCandidate } from "./domain.js";
import { assessCandidate } from "./risk-score.js";
import type { Ledger } from "./ledger.js";
import { SolanaSecurityInspector } from "./adapters/solana-security.js";
import { DexScreenerProvider } from "./adapters/dexscreener.js";
import type { Notifier } from "./notifier.js";
import { formatAssessment } from "./notifier.js";
import { PaperTrader } from "./paper-trader.js";
import { LiveTradeCoordinator } from "./live-trader.js";

const UNKNOWN_SECURITY: SecuritySnapshot = {
  mintAuthorityActive: null,
  freezeAuthorityActive: null,
  tokenProgram: "unknown",
  riskyExtensions: [],
  topHolderPercent: null,
  deployerSuspicious: null,
  sellSimulationOk: null,
  checkedAtMs: 0
};

export class Scanner {
  private readonly marketProvider: DexScreenerProvider;
  private readonly securityInspector: SolanaSecurityInspector;
  private readonly paperTrader: PaperTrader;
  private readonly liveTrader: LiveTradeCoordinator;

  public constructor(
    private readonly config: AppConfig,
    private readonly ledger: Ledger,
    private readonly notifier: Notifier
  ) {
    this.marketProvider = new DexScreenerProvider(config.dexScreenerBaseUrl);
    this.securityInspector = new SolanaSecurityInspector(new Connection(config.solanaRpcUrl, "confirmed"));
    this.paperTrader = new PaperTrader(ledger);
    this.liveTrader = new LiveTradeCoordinator(config, ledger);
  }

  public async scanOnce(nowMs = Date.now()): Promise<number> {
    const candidates = await this.marketProvider.discoverLatest(nowMs);
    const seen = new Set<string>();
    let processed = 0;
    for (const candidate of candidates) {
      const key = `${candidate.mint}:${candidate.market.pairAddress}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await this.process(candidate, nowMs);
      processed++;
    }
    return processed;
  }

  private async process(candidate: TokenCandidate, nowMs: number): Promise<void> {
    this.ledger.saveCandidate(candidate);
    let security = UNKNOWN_SECURITY;
    try {
      security = await this.securityInspector.inspect(candidate.mint, nowMs);
    } catch (error) {
      this.ledger.saveAudit("SECURITY_CHECK_FAILED", { mint: candidate.mint, error: String(error) }, nowMs);
    }
    const assessment = assessCandidate(candidate, security, this.config, nowMs);
    this.ledger.saveAssessment(assessment);
    await this.notifier.notify(formatAssessment(assessment));

    if (this.config.mode === "live") {
      try {
        await this.liveTrader.executeIfAllowed(assessment);
      } catch (error) {
        await this.notifier.notify(`[GATE] LIVE_FAILED ${candidate.symbol}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (this.config.mode === "paper" && (assessment.decision === "LIVE_ELIGIBLE" || assessment.decision === "ALERT")) {
      if (this.ledger.countOpenPaperPositions() < this.config.maxOpenPositions && !this.ledger.hasOpenPaperPosition(candidate.mint)) {
        const position = this.paperTrader.open(candidate, Math.min(this.config.maxPositionUsd, 10), nowMs);
        this.ledger.saveAudit("PAPER_DECISION", { assessment, position }, nowMs);
      }
    }
  }
}
