export type Slot = { weekday: number; start_time: string; end_time: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function nowIST() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { weekday: DAYS.indexOf(get("weekday")) + 1, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function clock(m: number, withSuffix = true) {
  const h = Math.floor(m / 60);
  const text = `${h % 12 || 12}:${String(m % 60).padStart(2, "0")}`;
  return withSuffix ? text + (h >= 12 ? " pm" : " am") : text;
}

function range(s: Slot) {
  const a = toMin(s.start_time), b = toMin(s.end_time);
  const sameHalf = a >= 720 === b >= 720;
  return `${clock(a, !sameHalf)}–${clock(b)}`;
}

export function availabilityLabel(slots: Slot[]): string {
  if (!slots.length) return "Availability coming soon";
  const { weekday, minutes } = nowIST();
  const byStart = (a: Slot, b: Slot) => toMin(a.start_time) - toMin(b.start_time);

  const today = slots.filter((s) => s.weekday === weekday && toMin(s.end_time) > minutes).sort(byStart)[0];
  if (today) return `Available today · ${range(today)}`;

  for (let offset = 1; offset <= 7; offset++) {
    const day = ((weekday - 1 + offset) % 7) + 1;
    const next = slots.filter((s) => s.weekday === day).sort(byStart)[0];
    if (next) return `Next available · ${offset === 1 ? "tomorrow" : DAYS[day - 1]} ${range(next)}`;
  }
  return "Availability coming soon";
}
