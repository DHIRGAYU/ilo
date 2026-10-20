// Single place for the website's entry points and shared constants.
export const STUDENT_PATH = "/login";
export const COUNSELLOR_PATH = "/counsellor";

// Used when NEXT_PUBLIC_CONTACT_EMAIL is not set. TODO: replace with the real address.
export const CONTACT_EMAIL_FALLBACK = "hello@ilo.example";

export function getContactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || CONTACT_EMAIL_FALLBACK;
}

export const PRIVACY_PROMISE =
  "Your college sees that counselling happened. Never who. Never what was said.";

// How it works, Privacy & Safety and Resources are sections of the home page.
// For Institutions is its own page.
export const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#privacy", label: "Privacy & Safety" },
  { href: "/#resources", label: "Resources" },
  { href: "/for-institutions", label: "For Institutions" },
] as const;

export const CRISIS_HREF = "/#help";

export const HELPLINES = {
  telemanas: { label: "Tele-MANAS", short: "14416", long: "1800-891-4416" },
  kiran: { label: "KIRAN", long: "1800-599-0019" },
} as const;
