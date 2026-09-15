import fs from "node:fs";
import type { TokenCandidate, TradePolicy } from "../domain.js";
import { assessCandidate } from "../risk-score.js";

export interface ReplayResult {
  events: number;
  rejected: number;
  alerts: number;
  liveEligible: number;
  averageScore: number;
}

export function replay(events: TokenCandidate[], policy: TradePolicy): ReplayResult {
  const scores = events.map((event) => assessCandidate(event, {
    mintAuthorityActive: false,
    freezeAuthorityActive: false,
    tokenProgram: "legacy",
    riskyExtensions: [],
    topHolderPercent: 10,
    deployerSuspicious: false,
    sellSimulationOk: true,
    checkedAtMs: event.market.observedAtMs
  }, policy));
  const sum = scores.reduce((total, assessment) => total + assessment.score, 0);
  return {
    events: scores.length,
    rejected: scores.filter((assessment) => assessment.decision === "REJECT").length,
    alerts: scores.filter((assessment) => assessment.decision === "ALERT").length,
    liveEligible: scores.filter((assessment) => assessment.decision === "LIVE_ELIGIBLE").length,
    averageScore: scores.length ? Math.round((sum / scores.length) * 100) / 100 : 0
  };
}

export function readNdjson(filename: string): TokenCandidate[] {
  return fs.readFileSync(filename, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as TokenCandidate);
}
