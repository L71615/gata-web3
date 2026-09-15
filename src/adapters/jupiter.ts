import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { TradeIntent } from "../domain.js";

interface JupiterOrderResponse {
  transaction: string | null;
  requestId: string;
  outAmount: string;
  errorCode?: number;
  errorMessage?: string;
}

interface JupiterExecuteResponse {
  status: "Success" | "Failed";
  signature?: string;
  error?: string;
}

export class JupiterExecutor {
  private readonly keypair: Keypair;

  public constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly privateKeyBase58: string
  ) {
    this.keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
  }

  public async execute(intent: TradeIntent): Promise<JupiterExecuteResponse> {
    const headers = { accept: "application/json", "x-api-key": this.apiKey };
    const query = new URLSearchParams({
      inputMint: intent.inputMint,
      outputMint: intent.outputMint,
      amount: intent.amountAtomic,
      taker: this.keypair.publicKey.toBase58(),
      slippageBps: String(intent.maxSlippageBps)
    });
    const orderResponse = await fetch(`${this.baseUrl}/swap/v2/order?${query}`, { headers });
    if (!orderResponse.ok) throw new Error(`Jupiter order failed: ${orderResponse.status}`);
    const order = await orderResponse.json() as JupiterOrderResponse;
    if (!order.transaction) throw new Error(order.errorMessage ?? "Jupiter returned no transaction.");

    const transaction = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
    transaction.sign([this.keypair]);
    const signedTransaction = Buffer.from(transaction.serialize()).toString("base64");
    const executeResponse = await fetch(`${this.baseUrl}/swap/v2/execute`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, requestId: order.requestId })
    });
    if (!executeResponse.ok) throw new Error(`Jupiter execute failed: ${executeResponse.status}`);
    return await executeResponse.json() as JupiterExecuteResponse;
  }
}
