import type { RiskAssessment } from "./domain.js";

export interface Notifier { notify(message: string): Promise<void>; }

export class ConsoleNotifier implements Notifier {
  public async notify(message: string): Promise<void> { console.log(message); }
}

export class TelegramNotifier implements Notifier {
  public constructor(private readonly botToken: string, private readonly chatId: string) {}

  public async notify(message: string): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: this.chatId, text: message, disable_web_page_preview: true })
    });
    if (!response.ok) throw new Error(`Telegram notification failed: ${response.status}`);
  }
}

export function formatAssessment(assessment: RiskAssessment): string {
  const { candidate, score, decision, reasons } = assessment;
  return [
    `[GATE] ${decision} ${candidate.symbol} score=${score}`,
    `${candidate.name} ${candidate.mint}`,
    `liq=$${candidate.market.liquidityUsd.toFixed(0)} vol24h=$${candidate.market.volume24hUsd.toFixed(0)} `
      + `buys5m=${candidate.market.buys5m} sells5m=${candidate.market.sells5m}`,
    `reasons=${reasons.length ? reasons.join(",") : "none"}`,
    candidate.market.url ?? ""
  ].filter(Boolean).join("\n");
}
