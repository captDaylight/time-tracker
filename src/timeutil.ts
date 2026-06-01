/** Local-time helpers. We keep everything in the machine's local timezone since
 * the whole point is to reflect the user's actual working day. */

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** YYYY-MM-DD in local time for a given Date (defaults to now). */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** HH:MM:SS in local time. */
export function localTime(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 12-hour clock time (e.g. "9:05 AM", "1:30 PM") in local time from an epoch-ms timestamp. */
export function hhmm(ts: number): string {
  const d = new Date(ts);
  const h24 = d.getHours();
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(d.getMinutes())} ${ampm}`;
}

export function minutesBetween(startMs: number, endMs: number): number {
  return Math.round(((endMs - startMs) / 60000) * 10) / 10;
}
