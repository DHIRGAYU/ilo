import { clock } from "@/lib/booking";

const TZ = "Asia/Kolkata";
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });

export const dayKey = (ms: number) => ymd.format(ms);

export function timeLabel(ms: number) {
  const [h, m] = hm.format(ms).split(":");
  return clock(Number(h) * 60 + Number(m));
}

export function dayLabel(ms: number, nowMs: number) {
  const d = ymd.format(ms);
  if (d === ymd.format(nowMs)) return "Today";
  if (d === ymd.format(nowMs - 86_400_000)) return "Yesterday";
  return dayFmt.format(ms);
}

/**
 * Safe UUID generator that works in non-secure contexts (e.g. testing over HTTP / LAN IP)
 * where window.crypto.randomUUID is not available.
 */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return ("" + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
