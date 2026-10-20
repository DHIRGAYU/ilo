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
