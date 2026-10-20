import Image from "next/image";
import Link from "next/link";
import { Asterisk } from "lucide-react";
import { HELPLINES, NAV_LINKS } from "./links";
import { container } from "./styles";

const links = [
  ...NAV_LINKS,
  { href: "/terms", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export function SiteFooter() {
  const t = HELPLINES.telemanas;
  const k = HELPLINES.kiran;
  return (
    <footer className="border-t border-ilo-plum/10 bg-ilo-blush/30">
      <div className={`${container} grid gap-10 py-12 lg:grid-cols-2`}>
        <div className="min-w-0">
          <Image src="/images/logo.png" alt="ilo" width={96} height={48} className="h-9 w-auto" />
          <p className="mt-3 font-display text-xl italic text-ilo-deep">Better Within.</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ilo-ink">
            Confidential, dignified mental health support connecting students to
            campus counsellors across India.
          </p>
        </div>
        <nav aria-label="Footer" className="min-w-0 lg:justify-self-end">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-ilo-ink hover:text-ilo-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ilo-plum/10">
        <div className={`${container} flex flex-col gap-2 py-5 text-xs leading-relaxed sm:flex-row sm:justify-between`}>
          <p className="flex items-start gap-2 text-ilo-crisis">
            <Asterisk className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Statutory Emergency: {t.label} ({t.short} / {t.long}) &middot; {k.label} ({k.long}) 24/7 across India
            </span>
          </p>
          <p className="font-semibold text-ilo-plum">DPDP Act 2023 Aligned &middot; Sovereign Data</p>
        </div>
      </div>

      <div className="border-t border-ilo-plum/10">
        <div className={`${container} flex flex-col gap-2 py-5 text-xs text-ilo-ink sm:flex-row sm:justify-between`}>
          <p>&copy; {new Date().getFullYear()} ilo technologies pvt ltd. All rights reserved.</p>
          <p className="font-semibold">Zero Ads &middot; Never Sold Data &middot; Strictly Encrypted</p>
          <p className="font-semibold">Made in India with quiet care</p>
        </div>
      </div>
    </footer>
  );
}
