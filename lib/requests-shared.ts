// Support requests: what a student writes, how it is described, and the wording used on both sides.
// The payload is locked on the student's device. These helpers only ever see it after it has been opened there.
export type Urgency = "urgent" | "moderate" | "routine";
export type RequestStatus = "new" | "accepted" | "referred" | "closed";
export type RequestPayload = { v: 1; topic: string; urgency: Urgency; note?: string; year?: string; branch?: string };

export const TOPICS = [
  "Stress & exam pressure", "Sleep & routine", "Feeling out of place", "Family expectations", "Concentration & fatigue",
  "Course or career worries", "Friendships & relationships", "Confidence", "Something else",
] as const;
export const YEARS = ["First-year", "Second-year", "Third-year", "Fourth-year", "Fifth-year", "Postgraduate", "Other"] as const;

// How a student describes it, and how the counsellor's board groups it
export const URGENCY: Record<Urgency, { student: string; hint: string; title: string; sub: string; dot: string }> = {
  urgent: { student: "As soon as possible", hint: "It feels heavy and I'd like to talk soon.", title: "Urgent", sub: "A timely first conversation", dot: "bg-ilo-crisis" },
  moderate: { student: "In the next few days", hint: "It's on my mind and I'd like some support.", title: "Moderate", sub: "A response in the coming days", dot: "bg-amber-600" },
  routine: { student: "Whenever you have space", hint: "No rush. I'd just like to be heard.", title: "Routine", sub: "Ready when you have space", dot: "bg-emerald-700" },
};

export const LIMITS = { note: 1000, branch: 60 };

export function toJson(p: RequestPayload): string {
  return JSON.stringify({
    v: 1, topic: p.topic, urgency: p.urgency,
    ...(p.note?.trim() ? { note: p.note.trim().slice(0, LIMITS.note) } : {}),
    ...(p.year ? { year: p.year } : {}),
    ...(p.branch?.trim() ? { branch: p.branch.trim().slice(0, LIMITS.branch) } : {}),
  });
}

// Returns null for anything that is not a request this version understands
export function parsePayload(json: string): RequestPayload | null {
  try {
    const p = JSON.parse(json);
    if (p?.v !== 1 || typeof p.topic !== "string" || !["urgent", "moderate", "routine"].includes(p.urgency)) return null;
    const str = (x: unknown, max: number) => (typeof x === "string" && x.trim() ? x.slice(0, max) : undefined);
    return { v: 1, topic: p.topic.slice(0, 80), urgency: p.urgency, note: str(p.note, LIMITS.note), year: str(p.year, 20), branch: str(p.branch, LIMITS.branch) };
  } catch {
    return null;
  }
}

export const aboutLine = (p: RequestPayload) => [p.year, p.branch].filter(Boolean).join(", ");

export function requestError(message: string): string {
  const m = (k: string) => message.includes(k);
  if (m("recipient_no_key")) return "They haven't turned on secure messaging yet, so a request can't be locked for them. Please try again a little later.";
  if (m("too_many_requests")) return "A request is already waiting, so please give your counsellor a little time to reply.";
  if (m("stale_key")) return "Their secure key just changed. Please try again.";
  if (m("cannot_update")) return "That request has already been handled. Refresh to see its latest state.";
  if (m("sender_no_key")) return "Secure messaging isn't set up on this device yet.";
  return "Something went wrong. Please try again.";
}

// Starting points for the counsellor's first message, which they can edit
export const ACCEPT_MESSAGE = "Thank you for reaching out. I've read what you shared, and I'm glad you did. Would you like to meet? You can book a time that suits you under Sessions, or just reply here and we can find one together.";
export const referColleagueMessage = (name: string) => `Thank you for trusting me with this. I think ${name} may be the best person to support you right now, so I've shared your request with them. They'll reach out to you here soon.`;
export const REFER_OUTSIDE_MESSAGE = "Thank you for trusting me with this. I think specialised support would help you most right now. You can talk to Tele-MANAS any time on 14416 (free, 24×7). If you ever feel unsafe, please call 112. I'm still here if you'd like to message me.";
