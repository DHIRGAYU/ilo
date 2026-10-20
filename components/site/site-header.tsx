"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { COUNSELLOR_PATH, CRISIS_HREF, NAV_LINKS, STUDENT_PATH } from "./links";
import { btn, container } from "./styles";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

const crisisPill =
  "inline-flex items-center gap-2 rounded-full bg-ilo-blush/70 px-3 py-1.5 text-xs font-semibold text-ilo-crisis hover:bg-ilo-blush";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ilo-plum/10 bg-ilo-bg/95 backdrop-blur">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <Link href="/" aria-label="ilo home" className={`shrink-0 rounded ${focus}`} onClick={close}>
          <Image src="/images/logo.png" alt="" width={96} height={48} priority className="h-9 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 xl:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`text-sm font-medium text-ilo-ink hover:text-ilo-plum aria-[current=page]:text-ilo-plum ${focus}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link href={CRISIS_HREF} className={`${crisisPill} ${focus}`}>
            <span className="size-1.5 rounded-full bg-ilo-crisis" aria-hidden="true" />
            In crisis? Get help
          </Link>
          <Link href={STUDENT_PATH} className={btn("primary", "sm")}>
            I&apos;m a student
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href={COUNSELLOR_PATH} className={btn("soft", "sm")}>
            I&apos;m a counsellor
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex size-11 items-center justify-center rounded-full border border-ilo-plum/20 text-ilo-plum xl:hidden ${focus}`}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <div id="mobile-menu" hidden={!open} className="border-t border-ilo-plum/10 bg-ilo-bg xl:hidden">
        <nav aria-label="Mobile" className={`${container} py-4`}>
          <ul className="divide-y divide-ilo-plum/10">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={close}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className={`block py-3 text-base font-medium text-ilo-ink aria-[current=page]:text-ilo-plum ${focus}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3 pb-2">
            <Link href={CRISIS_HREF} onClick={close} className={`${crisisPill} justify-center py-3 text-sm ${focus}`}>
              <span className="size-1.5 rounded-full bg-ilo-crisis" aria-hidden="true" />
              In crisis? Get help
            </Link>
            <Link href={STUDENT_PATH} onClick={close} className={btn("primary")}>
              I&apos;m a student
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href={COUNSELLOR_PATH} onClick={close} className={btn("soft")}>
              I&apos;m a counsellor
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
