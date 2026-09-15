# GATE DEX Trader

Safety-first Solana new-token screener and paper-trading MVP.

## Current status

- Solana candidate discovery through DexScreener's latest token profiles and pair data.
- On-chain mint and Token-2022 inspection through Solana RPC.
- Explainable risk scoring with hard rejection gates.
- SQLite candidate/risk/paper-trade/audit ledger.
- Paper trading and NDJSON replay backtest.
- Optional Telegram notifications.
- Jupiter execution adapter and live-trade coordinator are isolated and require explicit live-trading acknowledgement.
- Position-monitor action logic for take-profit, stop-loss and emergency liquidity exits.

## Quick start

```powershell
.\start.bat
```

The first run creates `.env`, installs dependencies if needed, builds the project, and starts the default paper-mode scanner. Useful options:

```powershell
.\start.bat -Once      # run one scan and exit
.\start.bat -Test      # run tests before starting
.\start.bat -Install  # reinstall exactly from package-lock.json
```

PowerShell users can run `.\start.ps1` directly. Edit `.env` to change RPC, polling and paper-trading settings.

The default mode is `paper`. `npm run scan` may use public RPC/API endpoints and can be rate limited. Set a production RPC before frequent polling.

## Modes

- `GATE_MODE=alert`: discovery, risk scoring and notifications only.
- `GATE_MODE=paper`: additionally records virtual positions.
- `GATE_MODE=live`: uses the guarded Jupiter coordinator only after explicit acknowledgement. It is still recommended to run alert and paper modes first and review the live audit log.

Live mode requires all of:

```text
GATE_MODE=live
LIVE_TRADING_ENABLED=true
LIVE_TRADING_ACK=I_UNDERSTAND_LIVE_TRADING_RISK
WALLET_PRIVATE_KEY=...
JUPITER_API_KEY=...
```

Never commit `.env`, seed phrases or private keys. Use a dedicated low-balance wallet.

## Backtest input

`npm run backtest -- events.ndjson` expects one normalized `TokenCandidate` JSON object per line and prints rejection/alert/eligibility counts and average score.

## Important limitations

This MVP does not claim profitability and does not detect every rug pull. Holder concentration, deployer history and sell simulation are explicit fields in the risk model but require additional indexed data providers before live eligibility should be trusted. External repositories are references, not production-safe dependencies.
