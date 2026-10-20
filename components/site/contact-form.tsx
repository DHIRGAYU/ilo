"use client";

import { useState } from "react";
import { CONTACT_EMAIL_FALLBACK } from "./links";
import { btn } from "./styles";

type Errors = Partial<Record<"name" | "email" | "institution", string>>;

const input =
  "mt-2 block w-full min-h-12 rounded-xl border border-ilo-plum/20 bg-white px-4 py-3 text-base text-ilo-ink placeholder:text-ilo-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum aria-[invalid=true]:border-ilo-crisis";
const label = "block text-sm font-semibold text-ilo-deep";
const err = "mt-1 text-sm text-ilo-crisis";

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [opened, setOpened] = useState(false);
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || CONTACT_EMAIL_FALLBACK;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const name = get("name");
    const from = get("email");
    const institution = get("institution");
    const type = get("type");
    const message = get("message");

    const next: Errors = {};
    if (!name) next.name = "Enter your name.";
    if (!from) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) next.email = "Enter a valid email address, like name@college.edu.";
    if (!institution) next.institution = "Enter the name of your institution.";
    setErrors(next);
    setOpened(false);

    const firstInvalid = (["name", "email", "institution"] as const).find((k) => next[k]);
    if (firstInvalid) {
      (e.currentTarget.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    // TODO: replace with a Supabase insert
    const subject = `Ilo demo request - ${institution}`;
    const bodyText = [
      `Name: ${name}`,
      `Email: ${from}`,
      `Institution: ${institution}`,
      `Type: ${type}`,
      "",
      message,
    ].join("\n");
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    setOpened(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="name" className={label}>Your name</label>
        <input id="name" name="name" type="text" autoComplete="name" className={input}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        {errors.name && <p id="name-error" className={err}>{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className={label}>Your email</label>
        <input id="email" name="email" type="email" autoComplete="email" className={input}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
        {errors.email && <p id="email-error" className={err}>{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="institution" className={label}>Institution name</label>
        <input id="institution" name="institution" type="text" autoComplete="organization" className={input}
          aria-invalid={!!errors.institution} aria-describedby={errors.institution ? "institution-error" : undefined} />
        {errors.institution && <p id="institution-error" className={err}>{errors.institution}</p>}
      </div>
      <div>
        <label htmlFor="type" className={label}>Type of institution</label>
        <select id="type" name="type" defaultValue="College" className={input}>
          <option>College</option>
          <option>School</option>
          <option>Coaching centre</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className={label}>Anything we should know? (optional)</label>
        <textarea id="message" name="message" rows={4} className={`${input} resize-y`} />
      </div>
      <button type="submit" className={btn("primary")}>Request a demo</button>
      <p aria-live="polite" className="text-sm leading-relaxed text-ilo-ink">
        {opened
          ? `Your email app should open with your message ready to send. If nothing opens, write to ${email}.`
          : "This opens your email app with your message ready to send."}
      </p>
    </form>
  );
}
