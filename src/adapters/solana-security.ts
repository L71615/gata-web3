import { Connection, PublicKey } from "@solana/web3.js";
import { ExtensionType, getExtensionTypes, getMint, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { SecuritySnapshot } from "../domain.js";

export class SolanaSecurityInspector {
  public constructor(private readonly connection: Connection) {}

  public async inspect(mintAddress: string, nowMs = Date.now()): Promise<SecuritySnapshot> {
    const mint = new PublicKey(mintAddress);
    const account = await this.connection.getAccountInfo(mint, "confirmed");
    if (!account) throw new Error(`Mint account not found: ${mintAddress}`);
    const isToken2022 = account.owner.equals(TOKEN_2022_PROGRAM_ID);
    const tokenProgram = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const mintInfo = await getMint(this.connection, mint, "confirmed", tokenProgram);
    const risky = new Set<ExtensionType>([
      ExtensionType.TransferFeeConfig,
      ExtensionType.ConfidentialTransferMint,
      ExtensionType.DefaultAccountState,
      ExtensionType.NonTransferable,
      ExtensionType.InterestBearingConfig,
      ExtensionType.PermanentDelegate,
      ExtensionType.TransferHook,
      ExtensionType.PausableConfig,
      ExtensionType.PermissionedBurn,
      ExtensionType.ScaledUiAmountConfig
    ]);
    const riskyExtensions = isToken2022
      ? getExtensionTypes(mintInfo.tlvData)
        .filter((extension) => risky.has(extension))
        .map((extension) => ExtensionType[extension] ?? String(extension))
      : [];
    let topHolderPercent: number | null = null;
    try {
      const largest = await this.connection.getTokenLargestAccounts(mint, "confirmed");
      const total = largest.value.slice(0, 10).reduce((sum, account) => sum + BigInt(account.amount), 0n);
      if (mintInfo.supply > 0n) topHolderPercent = Number((total * 10000n) / mintInfo.supply) / 100;
    } catch {
      // Some Token-2022 mints/RPC providers do not expose largest accounts.
    }
    return {
      mintAuthorityActive: mintInfo.mintAuthority !== null,
      freezeAuthorityActive: mintInfo.freezeAuthority !== null,
      tokenProgram: isToken2022 ? "token-2022" : "legacy",
      riskyExtensions,
      topHolderPercent,
      deployerSuspicious: null,
      sellSimulationOk: null,
      checkedAtMs: nowMs
    };
  }
}
