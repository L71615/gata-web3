import { z } from "zod";
import type { AppConfig } from "./domain.js";

const envSchema = z.object({
  GATE_MODE: z.enum(["alert", "paper", "live"]).default("paper"),
  SOLANA_RPC_URL: z.string().url().default("https://api.mainnet-beta.solana.com"),
  DEXSCREENER_BASE_URL: z.string().url().default("https://api.dexscreener.com"),
  JUPITER_BASE_URL: z.string().url().default("https://api.jup.ag"),
  JUPITER_API_KEY: z.string().optional(),
  SOLANA_QUOTE_MINT: z.string().default("So11111111111111111111111111111111111111112"),
  LIVE_POSITION_AMOUNT_ATOMIC: z.string().regex(/^\d+$/).default("10000000"),
  KILL_SWITCH_FILE: z.string().min(1).default("./data/KILL_SWITCH"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  DATABASE_PATH: z.string().min(1).default("./data/gate.sqlite"),
  LIVE_TRADING_ENABLED: z.coerce.boolean().default(false),
  LIVE_TRADING_ACK: z.string().optional(),
  WALLET_PRIVATE_KEY: z.string().optional(),
  MIN_LIQUIDITY_USD: z.coerce.number().positive().default(10000),
  MIN_SCORE: z.coerce.number().min(0).max(100).default(75),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().nonnegative().default(300),
  MAX_PRICE_IMPACT_BPS: z.coerce.number().int().nonnegative().default(500),
  MAX_POSITION_USD: z.coerce.number().positive().default(25),
  MAX_DAILY_LOSS_USD: z.coerce.number().positive().default(25),
  MAX_OPEN_POSITIONS: z.coerce.number().int().positive().default(2),
  MAX_TOP_HOLDER_PERCENT: z.coerce.number().min(0).max(100).default(35),
  TAKE_PROFIT_PERCENT: z.coerce.number().positive().default(30),
  STOP_LOSS_PERCENT: z.coerce.number().positive().default(15),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional()
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const liveTradingEnabled = parsed.LIVE_TRADING_ENABLED && parsed.GATE_MODE === "live";

  if (liveTradingEnabled) {
    if (!parsed.WALLET_PRIVATE_KEY) {
      throw new Error("Live trading requires WALLET_PRIVATE_KEY in the environment.");
    }
    if (!parsed.JUPITER_API_KEY) {
      throw new Error("Live trading requires JUPITER_API_KEY in the environment.");
    }
    if (parsed.LIVE_TRADING_ACK !== "I_UNDERSTAND_LIVE_TRADING_RISK") {
      throw new Error("Set LIVE_TRADING_ACK=I_UNDERSTAND_LIVE_TRADING_RISK to explicitly enable live trading.");
    }
  }

  return {
    mode: parsed.GATE_MODE,
    solanaRpcUrl: parsed.SOLANA_RPC_URL,
    dexScreenerBaseUrl: parsed.DEXSCREENER_BASE_URL,
    jupiterBaseUrl: parsed.JUPITER_BASE_URL,
    jupiterApiKey: parsed.JUPITER_API_KEY,
    solanaQuoteMint: parsed.SOLANA_QUOTE_MINT,
    livePositionAmountAtomic: parsed.LIVE_POSITION_AMOUNT_ATOMIC,
    killSwitchFile: parsed.KILL_SWITCH_FILE,
    pollIntervalMs: parsed.POLL_INTERVAL_MS,
    databasePath: parsed.DATABASE_PATH,
    liveTradingEnabled,
    walletPrivateKey: parsed.WALLET_PRIVATE_KEY,
    telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
    telegramChatId: parsed.TELEGRAM_CHAT_ID,
    minLiquidityUsd: parsed.MIN_LIQUIDITY_USD,
    minScore: parsed.MIN_SCORE,
    maxSlippageBps: parsed.MAX_SLIPPAGE_BPS,
    maxPriceImpactBps: parsed.MAX_PRICE_IMPACT_BPS,
    maxPositionUsd: parsed.MAX_POSITION_USD,
    maxDailyLossUsd: parsed.MAX_DAILY_LOSS_USD,
    maxOpenPositions: parsed.MAX_OPEN_POSITIONS,
    maxTopHolderPercent: parsed.MAX_TOP_HOLDER_PERCENT,
    takeProfitPercent: parsed.TAKE_PROFIT_PERCENT,
    stopLossPercent: parsed.STOP_LOSS_PERCENT
  };
}
