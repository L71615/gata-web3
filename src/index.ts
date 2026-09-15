import "dotenv/config";
import pino from "pino";
import { loadConfig } from "./config.js";
import { Ledger } from "./ledger.js";
import { ConsoleNotifier, TelegramNotifier } from "./notifier.js";
import { Scanner } from "./scanner.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const config = loadConfig();
const ledger = new Ledger(config.databasePath);
const notifier = config.telegramBotToken && config.telegramChatId
  ? new TelegramNotifier(config.telegramBotToken, config.telegramChatId)
  : new ConsoleNotifier();
const scanner = new Scanner(config, ledger, notifier);
const once = process.argv.includes("--once");

logger.info({ mode: config.mode, liveTradingEnabled: config.liveTradingEnabled }, "GATE scanner started");

async function run(): Promise<void> {
  try {
    const processed = await scanner.scanOnce();
    logger.info({ processed }, "scan completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ledger.saveAudit("SCAN_FAILED", { error: message });
    logger.error({ error: message }, "scan failed; no trades were attempted");
  }
}

await run();
if (!once) {
  const timer = setInterval(() => void run(), config.pollIntervalMs);
  const shutdown = (): void => { clearInterval(timer); ledger.close(); process.exit(0); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
