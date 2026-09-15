import type { MarketSnapshot, RiskAssessment, SecuritySnapshot, TokenCandidate, TradePolicy, RiskCode } from "./domain.js";

function addReason(reasons: RiskCode[], reason: RiskCode): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function bounded(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function assessCandidate(
  candidate: TokenCandidate,
  security: SecuritySnapshot,
  policy: TradePolicy,
  nowMs = Date.now()
): RiskAssessment {
  const market = candidate.market;
  const reasons: RiskCode[] = [];
  let score = 0;

  if (!Number.isFinite(market.priceUsd) || market.priceUsd <= 0) addReason(reasons, "NO_VALID_MARKET");
  if (market.liquidityUsd < policy.minLiquidityUsd) {
    addReason(reasons, "LOW_LIQUIDITY");
  } else {
    score += bounded((market.liquidityUsd / policy.minLiquidityUsd) * 20, 0, 20);
  }

  const activity = market.buys5m + market.sells5m;
  const buyPressure = activity === 0 ? 0 : market.buys5m / activity;
  score += bounded(buyPressure * 25, 0, 25);
  score += bounded(Math.log10(Math.max(1, market.volume24hUsd)) * 4, 0, 20);
  score += bounded(market.priceChange5mPct > 0 ? 10 : 0, 0, 10);
  score += bounded(market.buyers5m > market.sellers5m ? 10 : 0, 0, 10);
  score += bounded(market.priceChange1hPct > 0 ? 5 : 0, 0, 5);

  if (security.mintAuthorityActive === true) {
    addReason(reasons, "ACTIVE_MINT_AUTHORITY");
    score -= 25;
  } else if (security.mintAuthorityActive === false) {
    score += 8;
  }
  if (security.freezeAuthorityActive === true) {
    addReason(reasons, "ACTIVE_FREEZE_AUTHORITY");
    score -= 25;
  } else if (security.freezeAuthorityActive === false) {
    score += 8;
  }
  if (security.riskyExtensions.length > 0) {
    addReason(reasons, "TOKEN_2022_RISK_EXTENSION");
    score -= 20;
  }
  if (security.topHolderPercent !== null) {
    if (security.topHolderPercent > policy.maxTopHolderPercent) {
      addReason(reasons, "HIGH_HOLDER_CONCENTRATION");
      score -= 25;
    } else {
      score += 10;
    }
  } else {
    addReason(reasons, "INCOMPLETE_SECURITY_DATA");
  }
  if (security.deployerSuspicious === true) {
    addReason(reasons, "SUSPICIOUS_DEPLOYER");
    score -= 30;
  }
  if (security.sellSimulationOk === false) {
    addReason(reasons, "SELL_SIMULATION_FAILED");
    score -= 100;
  }
  if (market.priceImpactBps !== undefined && market.priceImpactBps > policy.maxPriceImpactBps) {
    addReason(reasons, "HIGH_PRICE_IMPACT");
    score -= 30;
  }
  if (nowMs - market.observedAtMs > 120_000) addReason(reasons, "STALE_MARKET_DATA");

  const hardRejected = reasons.includes("NO_VALID_MARKET")
    || reasons.includes("SELL_SIMULATION_FAILED")
    || reasons.includes("ACTIVE_MINT_AUTHORITY")
    || reasons.includes("ACTIVE_FREEZE_AUTHORITY")
    || reasons.includes("TOKEN_2022_RISK_EXTENSION")
    || reasons.includes("LOW_LIQUIDITY")
    || reasons.includes("HIGH_PRICE_IMPACT");
  const finalScore = Math.round(bounded(score));
  const decision = hardRejected || finalScore < policy.minScore
    ? "REJECT"
    : security.deployerSuspicious === null || security.sellSimulationOk === null
      ? "ALERT"
      : "LIVE_ELIGIBLE";

  return { score: finalScore, decision, hardRejected, reasons, assessedAtMs: nowMs, candidate, security };
}
