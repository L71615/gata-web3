import type { PaperPosition, SecuritySnapshot } from "./domain.js";

export type PositionAction = "HOLD" | "TAKE_PROFIT" | "STOP_LOSS" | "EMERGENCY_SELL";

export function evaluatePosition(
  position: PaperPosition,
  currentPriceUsd: number,
  currentLiquidityUsd: number,
  minLiquidityUsd: number,
  security: SecuritySnapshot,
  takeProfitPercent: number,
  stopLossPercent: number
): PositionAction {
  if (security.sellSimulationOk === false || currentLiquidityUsd < minLiquidityUsd) return "EMERGENCY_SELL";
  const changePct = ((currentPriceUsd - position.entryPriceUsd) / position.entryPriceUsd) * 100;
  if (changePct >= takeProfitPercent) return "TAKE_PROFIT";
  if (changePct <= -stopLossPercent) return "STOP_LOSS";
  return "HOLD";
}
