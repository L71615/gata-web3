import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uiRoot = path.join(root, "ui");
const dbFile = path.resolve(root, process.env.DATABASE_PATH ?? "data/gate.sqlite");
const host = process.env.UI_HOST ?? "127.0.0.1";
const port = Number(process.env.UI_PORT ?? 8787);
const db = new Database(dbFile, { readonly: true, fileMustExist: false });

function rows(sql, limit = 50) {
  try { return db.prepare(sql).all(limit); } catch { return []; }
}
function json(response, payload, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}
function dashboard() {
  const count = (table) => { try { return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n; } catch { return 0; } };
  const assessments = rows("SELECT payload FROM risk_assessments ORDER BY id DESC LIMIT ?").map((r) => JSON.parse(r.payload));
  const positions = rows("SELECT payload FROM paper_trades ORDER BY opened_at DESC LIMIT ?").map((r) => JSON.parse(r.payload));
  const audit = rows("SELECT event_type AS eventType, created_at AS createdAt, payload FROM audit_events ORDER BY id DESC LIMIT ?").map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
  const realizedPnlUsd = positions.filter((p) => p.status === "CLOSED").reduce((sum, p) => sum + Number(p.pnlUsd ?? 0), 0);
  return { summary: { candidates: count("candidates"), assessments: count("risk_assessments"), openPaper: positions.filter((p) => p.status === "OPEN").length, realizedPnlUsd }, assessments, paperPositions: positions, audit };
}
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (url.pathname === "/api/dashboard") return json(response, dashboard());
    const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (relative.includes("..") || !["index.html", "app.js", "styles.css"].includes(relative)) return json(response, { error: "Not found" }, 404);
    const file = path.join(uiRoot, relative);
    response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
    response.end(fs.readFileSync(file));
  } catch (error) { json(response, { error: error instanceof Error ? error.message : String(error) }, 500); }
});
server.listen(port, host, () => console.log(`[GATE] Dashboard: http://${host}:${port}`));

const scanner = process.env.UI_START_SCANNER === "false" ? null : spawn(process.execPath, [path.join(root, "dist", "src", "index.js")], { cwd: root, stdio: "inherit", windowsHide: false });
const shutdown = () => { if (scanner && !scanner.killed) scanner.kill(); db.close(); server.close(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
