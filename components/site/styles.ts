// Shared Tailwind class strings for the website.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2";

export type BtnVariant = "primary" | "soft" | "secondary" | "light" | "lightOutline";

export function btn(variant: BtnVariant, size: "md" | "sm" = "md") {
  const sizing = size === "md" ? "min-h-12 px-7 py-3" : "min-h-10 px-5 py-2";
  const looks: Record<BtnVariant, string> = {
    primary:
      "bg-linear-to-r from-ilo-plum to-ilo-deep text-white shadow-sm hover:opacity-90 focus-visible:outline-ilo-plum",
    soft: "bg-ilo-plum text-white shadow-sm hover:bg-ilo-deep focus-visible:outline-ilo-plum",
    secondary:
      "border border-ilo-plum/30 bg-white text-ilo-plum hover:bg-ilo-blush focus-visible:outline-ilo-plum",
    light: "bg-white text-ilo-plum shadow-sm hover:bg-ilo-blush focus-visible:outline-white",
    lightOutline:
      "border border-white/60 text-white hover:bg-white/10 focus-visible:outline-white",
  };
  return `${base} ${sizing} ${looks[variant]}`;
}

export const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
export const h1 =
  "font-display text-4xl leading-[1.1] text-ilo-deep break-words sm:text-5xl lg:text-6xl";
export const h2 =
  "font-display text-3xl leading-tight text-ilo-deep break-words sm:text-4xl";
export const h3 = "font-display text-xl text-ilo-deep break-words";
export const lead = "max-w-prose text-lg leading-relaxed text-ilo-ink";
export const body = "max-w-prose text-base leading-relaxed text-ilo-ink";
export const small = "text-sm leading-relaxed text-ilo-ink";
export const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-ilo-plum";
export const pill =
  "inline-flex items-center gap-2 rounded-full bg-ilo-blush px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ilo-plum";
export const card =
  "min-w-0 rounded-2xl border border-ilo-plum/10 bg-white p-6 shadow-sm";
export const iconBox =
  "inline-flex size-10 items-center justify-center rounded-xl bg-ilo-blush text-ilo-plum";
export const textLink =
  "font-semibold text-ilo-plum underline underline-offset-4 hover:text-ilo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
