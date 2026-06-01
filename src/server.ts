import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, saveProjects } from "./config.js";
import { listDates, readSamples } from "./store.js";
import { aggregate } from "./aggregate.js";
import { summarize } from "./summary.js";
import { applyEdits, readEdits, saveEdit, type BlockEdit } from "./edits.js";
import { shotsInRange, shotPath } from "./screenshots.js";
import { getHealth } from "./health.js";
import { blocksToCsv } from "./csv.js";
import { hhmm } from "./timeutil.js";
import { readFile as readFileAsync } from "node:fs/promises";
import type { Config, ProjectRule } from "./types.js";

/** Make a URL-safe slug from a project name (used as a fallback id). */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `project-${Date.now()}`
  );
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiDir = join(__dirname, "..", "resources", "ui");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

/** Serve a built static asset from the UI dir, guarding against path traversal. */
async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = join(uiDir, rel);
  if (!full.startsWith(uiDir)) {
    return send(res, 403, "forbidden", "text/plain");
  }
  try {
    const buf = await readFileAsync(full);
    const ext = full.slice(full.lastIndexOf("."));
    const type = MIME[ext] ?? "application/octet-stream";
    const cache = ext === ".html" ? "no-store" : "max-age=31536000, immutable";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": cache });
    res.end(buf);
  } catch {
    // SPA fallback: unknown non-API path → index.html
    const html = await readFileAsync(join(uiDir, "index.html"), "utf8");
    send(res, 200, html, "text/html; charset=utf-8");
  }
}

/** Aggregate a day's samples and overlay any manual edits. */
function editedBlocks(date: string, config: Config) {
  return applyEdits(aggregate(readSamples(date), config), readEdits(date));
}

/** Build the day payload (blocks + summary) the UI renders. */
function dayPayload(date: string, config: Config) {
  const raw = editedBlocks(date, config);
  const blocks = raw.map((b) => ({
    ...b,
    id: String(b.start),
    startLabel: hhmm(b.start),
    endLabel: hhmm(b.end),
  }));
  return {
    date,
    blocks,
    summary: summarize(raw),
    projects: config.projects,
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1_000_000) req.destroy(); // guard against runaway bodies
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: string, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const config = loadConfig();

  try {
    if (url.pathname === "/api/days") {
      return send(res, 200, JSON.stringify({ days: listDates() }));
    }
    if (url.pathname === "/api/health") {
      return send(res, 200, JSON.stringify(getHealth()));
    }
    if (url.pathname === "/api/projects" && req.method === "GET") {
      return send(res, 200, JSON.stringify({ projects: config.projects }));
    }
    if (url.pathname === "/api/projects" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}") as { projects?: ProjectRule[] };
      if (!Array.isArray(body.projects)) {
        return send(res, 400, JSON.stringify({ error: "projects array required" }));
      }
      // Normalize: ensure each project has a stable id and clean arrays.
      const cleaned: ProjectRule[] = body.projects
        .filter((p) => (p.name ?? "").trim().length > 0)
        .map((p) => ({
          id: (p.id ?? "").trim() || slugify(p.name),
          name: p.name.trim(),
          externalId: (p.externalId ?? "").trim(),
          folders: (p.folders ?? []).map((f) => f.trim()).filter(Boolean),
          titleKeywords: (p.titleKeywords ?? []).map((k) => k.trim()).filter(Boolean),
          color: (p.color ?? "").trim() || "#3a7afe",
        }));
      const updated = saveProjects(cleaned);
      return send(res, 200, JSON.stringify({ projects: updated.projects }));
    }
    if (url.pathname === "/api/open-settings" && req.method === "POST") {
      // Open the macOS Privacy panes so the user can grant permission. Lazily
      // import electron so this server stays usable in plain-node tests.
      try {
        const { shell } = await import("electron");
        const pane = (await readBody(req)).includes("screen")
          ? "Privacy_ScreenCapture"
          : "Privacy_Accessibility";
        await shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
        return send(res, 200, JSON.stringify({ ok: true }));
      } catch (err) {
        return send(res, 500, JSON.stringify({ ok: false, error: String(err) }));
      }
    }
    if (url.pathname === "/api/day") {
      const date = url.searchParams.get("date") ?? listDates()[0] ?? "";
      return send(res, 200, JSON.stringify(dayPayload(date, config)));
    }
    if (url.pathname === "/api/shots") {
      const start = Number(url.searchParams.get("start"));
      const end = Number(url.searchParams.get("end"));
      if (!start || !end) return send(res, 400, JSON.stringify({ error: "start and end required" }));
      const shots = shotsInRange(start, end).map((s) => ({ ...s, label: hhmm(s.ts) }));
      return send(res, 200, JSON.stringify({ shots }));
    }
    if (url.pathname === "/shot") {
      const file = url.searchParams.get("file") ?? "";
      const full = shotPath(file);
      if (!full) return send(res, 404, "not found", "text/plain");
      const buf = await readFileAsync(full);
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "max-age=86400" });
      return res.end(buf);
    }
    if (url.pathname === "/api/edit" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}") as { date?: string } & BlockEdit;
      const date = body.date;
      if (!date || !body.id) return send(res, 400, JSON.stringify({ error: "date and id required" }));
      saveEdit(date, {
        id: body.id,
        project: body.project,
        task: body.task,
        detail: body.detail,
        category: body.category,
        cleared: body.cleared,
      });
      return send(res, 200, JSON.stringify(dayPayload(date, config)));
    }
    if (url.pathname === "/api/export") {
      const date = url.searchParams.get("date");
      if (!date) return send(res, 400, JSON.stringify({ error: "date required" }));
      const csv = blocksToCsv(editedBlocks(date, config));
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="timesheet-${date}.csv"`,
        "Cache-Control": "no-store",
      });
      return res.end(csv);
    }
    if (url.pathname.startsWith("/api/")) {
      return send(res, 404, JSON.stringify({ error: "not found" }));
    }
    return serveStatic(res, url.pathname);
  } catch (err) {
    return send(res, 500, JSON.stringify({ error: String(err) }));
  }
}

export interface RunningServer {
  url: string;
  port: number;
  stop: () => void;
}

/** Start the local web server, bound to loopback only (not exposed to the network). */
export function startServer(config: Config): Promise<RunningServer> {
  const port = config.httpPort;
  const server = createServer((req, res) => void handle(req, res));
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    // Bind to 127.0.0.1 so the UI is reachable only from this machine.
    server.listen(port, "127.0.0.1", () => {
      const url = `http://localhost:${port}`;
      console.log(`[server] listening on ${url}`);
      resolve({ url, port, stop: () => server.close() });
    });
  });
}
