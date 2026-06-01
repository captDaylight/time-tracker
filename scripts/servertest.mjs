// Start the web server (no Electron) and hit each endpoint.
import { startServer } from "../dist/server.js";
import { loadConfig } from "../dist/config.js";

const config = loadConfig();
const s = await startServer(config);
const base = s.url;

async function show(path) {
  const r = await fetch(base + path);
  const ct = r.headers.get("content-type");
  const body = await r.text();
  console.log(`\n--- GET ${path}  [${r.status}, ${ct}] ---`);
  console.log(body.length > 600 ? body.slice(0, 600) + `\n…(${body.length} bytes)` : body);
}

await show("/api/days");
await show("/api/day");
const days = (await fetch(base + "/api/days").then((r) => r.json())).days;
if (days[0]) await show("/api/export?date=" + days[0]);
await show("/"); // HTML page

s.stop();
console.log("\nSERVERTEST: DONE");
process.exit(0);
