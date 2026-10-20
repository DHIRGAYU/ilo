import { clock } from "@/lib/booking";

const TZ = "Asia/Kolkata";
const DAY_MS = 86_400_000;
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const dShort = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const dLong = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" });
const monthDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Students may cancel or reschedule until this long before the session starts
export const CHANGE_CUTOFF_MS = 2 * 3_600_000;
export const canChange = (startsAtMs: number, nowMs: number) => startsAtMs > nowMs + CHANGE_CUTOFF_MS;

// "Tomorrow (Tue), Oct 20 · 4:00 pm"
export function friendlyWhen(ms: number, nowMs: number) {
  const midnight = (t: number) => Date.parse(`${ymd.format(t)}T00:00:00+05:30`);
  const diff = Math.round((midnight(ms) - midnight(nowMs)) / DAY_MS);
  const label = diff === 0 ? "Today" : diff === 1 ? `Tomorrow (${dShort.format(ms)})` : diff > 1 && diff < 7 ? dLong.format(ms) : dShort.format(ms);
  const [h, m] = hm.format(ms).split(":");
  return `${label}, ${monthDay.format(ms)} · ${clock(Number(h) * 60 + Number(m))}`;
}

// "Dr. Meera Sen" -> "Dr. Sen"
export function shortName(name: string) {
  const w = name.split(" ");
  return /^(dr|prof|mr|ms|mrs)\.?$/i.test(w[0]) && w.length > 2 ? `${w[0]} ${w[w.length - 1]}` : name;
}
