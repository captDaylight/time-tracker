# TimeTracker

A passive desktop time tracker. It silently samples the focused window, infers
which **project** and **task** you're working on from simple rules, and exports a
daily **CSV** timesheet — with unexplained **gaps** and **idle/away** periods marked.

Built with Electron + TypeScript so it can be developed/tested on macOS and shipped
to Windows.

## Status — Phase 1 (core)

Done and tested:

- Background **sampler** — records app name, window title, file/exe path, idle time every 15s.
- **Classifier** — maps each sample to a project (folder/keyword rules) + task (app/url rules) with a confidence level.
- **Aggregator** — merges consecutive samples into blocks; detects time **gaps** and **idle** stretches.
- **UI: React + Tailwind v4 + Headless UI**, built by Vite into `resources/ui/` and served
  as fully static, offline assets by the local server (no CDN — works offline on Windows).
  Inline row editing (click a row to fill gaps with project/task/details), screenshot strips
  with a lightbox, accessible date picker. Source in `ui/`; run `npm run dev:ui` for hot reload.
- **Local web UI** at `http://localhost:4321` (bound to loopback only — not exposed to the network):
  live "today" view with current activity, per-project totals, gaps/idle, low-confidence flags,
  plus a **date picker to browse past days** and a CSV download button.
- The Electron window is a thin shell around that same web UI; tray has **Show window** / **Open in browser**.
- **CSV export** — one row per block: date, start, end, duration, type, project, task, app, detail, confidence, notes.

Planned next (in order): screenshots (10-min, 2-monitor, 14-day purge) → editable
end-of-day review table with 4:30pm nudge → live "current day" window + corner widget
→ browser URL capture → Google Calendar → Monograph.

## Develop / run (macOS)

```bash
npm install
npm start        # builds and launches the menubar app
```

The app window opens automatically, and the same UI is available in any browser at
**`http://localhost:4321`** (change the port via `httpPort` in config). Use the date
dropdown / ‹ › / **Today** buttons to review past days; **Download CSV** exports the
selected day.

On first launch a config file is created at:
`~/Library/Application Support/time-tracker/config.json`

**macOS permission:** to capture window *titles* and browser *URLs*, grant
**Screen Recording** permission to the app (System Settings → Privacy & Security →
Screen Recording), then restart it. App names and idle time work without it.
On **Windows this is not required** — titles are always available.

### Export a CSV manually

```bash
npm run export                 # today
node dist/cli-export.js 2026-05-30   # a specific date
```

Data lives under `~/Library/Application Support/time-tracker/`
(`samples/`, `exports/`) on macOS, and `%APPDATA%/time-tracker/` on Windows.

### Self-test (no permissions needed)

```bash
npm run build && node scripts/selftest.mjs
```

## Configure projects & tasks

Edit `config.json`:

- `projects[]` — `folders` (path fragments that prove a project, e.g. `"Strong Residence"`)
  and `titleKeywords` (softer hints). Folder matches are **high** confidence; keyword matches **medium**.
- `taskRules[]` — map an `app` (and/or `urlContains` / `titleContains`) to a task label,
  e.g. InDesign → "Presentation drawing", Excel → "Bidding / documentation".

## Build & install the macOS app

```bash
npm run dist:mac   # produces a .dmg under dist/ via electron-builder
```

The build is **ad-hoc signed**, not notarized (no Apple Developer certificate), so
the first launch of a downloaded build is blocked by Gatekeeper. To open it:

1. Drag **TimeTracker** into Applications.
2. **Right-click the app → Open**, then confirm in the dialog. (Plain double-click
   won't offer the option — you must use right-click → Open the first time.)

After that first approval it opens normally. If macOS still refuses, clear the
download-quarantine flag once:

```bash
xattr -dr com.apple.quarantine /Applications/TimeTracker.app
```

### Start automatically at login

So the day is never missed, the tracker **registers itself to launch at login**
(reboot) the first time you run an installed build — as a macOS *Login Item* and via
the Windows *Run* registry key. When it's launched at login it starts **in the
background** (tray/menu-bar only, no window) and begins sampling immediately.

Toggle it any time from the tray/menu-bar icon → **"Start at login (background)"**.
The choice is saved as `autoLaunch` in `config.json`. (This only applies to installed
builds — running from source via `npm start` never touches your login items.)

### Updating

Just download the new `.dmg` and drag the new app over the old one in Applications.
**Your data is never touched** — samples, edits, screenshots and config live in
`~/Library/Application Support/time-tracker/`, completely separate from the app
bundle, so every update keeps your existing history.

## Build the Windows installer

```bash
npm run dist:win   # produces an NSIS .exe installer under dist/ via electron-builder
```

Hand the `.exe` to the Windows machine and install. (Manual update model: rebuild and
reinstall to update.)
