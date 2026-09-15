import "dotenv/config";
import { readNdjson, replay } from "./replay.js";
import { loadConfig } from "../config.js";

const filename = process.argv[2];
if (!filename) throw new Error("Usage: npm run backtest -- path/to/events.ndjson");
const config = loadConfig();
console.log(JSON.stringify(replay(readNdjson(filename), config), null, 2));
