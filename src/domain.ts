export type Decision = "REJECT" | "ALERT" | "PAPER" | "LIVE_ELIGIBLE";

export type RiskCode =
  | "ACTIVE_MINT_AUTHORITY"
  | "ACTIVE_FREEZE_AUTHORITY"
  | "TOKEN_2022_RISK_EXTENSION"
  | "SELL_SIMULATION_FAILED"
  | "LOW_LIQUIDITY"
  | "HIGH_PRICE_IMPACT"
  | "HIGH_HOLDER_CONCENTRATION"
  | "SUSPICIOUS_DEPLOYER"
  | "STALE_MARKET_DATA"
  | "RPC_UNAVAILABLE"
  | "INCOMPLETE_SECURITY_DATA"
  | "NO_VALID_MARKET";

export interface MarketSnapshot {
  priceUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  buys5m: number;
  sells5m: number;
  buyers5m: number;
  sellers5m: number;
  priceChange5mPct: number;
  priceChange1hPct: number;
  priceImpactBps?: number;
  pairCreatedAtMs: number;
  observedAtMs: number;
  dexId: string;
  pairAddress: string;
  url?: string;
}

export interface SecuritySnapshot {
  mintAuthorityActive: boolean | null;
  freezeAuthorityActive: boolean | null;
  tokenProgram: "legacy" | "token-2022" | "unknown";
  riskyExtensions: string[];
  topHolderPercent: number | null;
  deployerSuspicious: boolean | null;
  sellSimulationOk: boolean | null;
  checkedAtMs: number;
}

export interface TokenCandidate {
  chain: "solana";
  mint: string;
  symbol: string;
  name: string;
  market: MarketSnapshot;
  discoveredAtMs: number;
}

export interface RiskAssessment {
  score: number;
  decision: Decision;
  hardRejected: boolean;
  reasons: RiskCode[];
  assessedAtMs: number;
  candidate: TokenCandidate;
  security: SecuritySnapshot;
}

export interface TradePolicy {
  minLiquidityUsd: number;
  minScore: number;
  maxSlippageBps: number;
  maxPriceImpactBps: number;
  maxPositionUsd: number;
  maxDailyLossUsd: number;
  maxOpenPositions: number;
  maxTopHolderPercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
}

export interface AppConfig extends TradePolicy {
  mode: "alert" | "paper" | "live";
  solanaRpcUrl: string;
  dexScreenerBaseUrl: string;
  jupiterBaseUrl: string;
  jupiterApiKey?: string;
  solanaQuoteMint: string;
  livePositionAmountAtomic: string;
  pollIntervalMs: number;
  databasePath: string;
  liveTradingEnabled: boolean;
  killSwitchFile: string;
  walletPrivateKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface PaperPosition {
  id: string;
  mint: string;
  symbol: string;
  quantity: number;
  entryPriceUsd: number;
  currentPriceUsd: number;
  investedUsd: number;
  openedAtMs: number;
  closedAtMs?: number;
  exitPriceUsd?: number;
  pnlUsd?: number;
  status: "OPEN" | "CLOSED";
}

export interface TradeIntent {
  mint: string;
  symbol: string;
  inputMint: string;
  outputMint: string;
  amountAtomic: string;
  maxSlippageBps: number;
  reason: string;
}
