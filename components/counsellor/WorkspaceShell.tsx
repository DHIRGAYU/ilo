"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, BookOpen, CalendarDays, Home, HeartHandshake, Inbox, LogOut, Menu, Phone, Search, Settings, ShieldAlert, Users, X } from "lucide-react";

const NAV = [
  { href: "/counsellor", label: "Dashboard", icon: Home, badge: null },
  { href: "/counsellor/requests", label: "Requests", icon: HeartHandshake, badge: "requests" },
  { href: "/counsellor/schedule", label: "Schedule", icon: CalendarDays, badge: null },
  { href: "/counsellor/inbox", label: "Inbox", icon: Inbox, badge: "inbox" },
  { href: "/counsellor/students", label: "Students", icon: Users, badge: null },
  { href: "/counsellor/resources", label: "Resources", icon: BookOpen, badge: null },
  { href: "/counsellor/insights", label: "Insights", icon: Activity, badge: null },
  { href: "/counsellor/settings", label: "Settings", icon: Settings, badge: null },
] as const;

type Badges = { requests: number; inbox: number };

function NavList({ badges, onNavigate }: { badges: Badges; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Counsellor workspace" className="mt-3 space-y-1">
      {NAV.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/counsellor" ? path === href : path.startsWith(href);
        const count = badge ? badges[badge] : 0;
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${active ? "bg-ilo-blush text-ilo-plum" : "text-ilo-ink hover:bg-ilo-blush/50"}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ilo-blush px-1.5 text-[10px] font-bold text-ilo-plum ring-1 ring-ilo-plum/15">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-1">
      <Image src="/images/logo.png" alt="ilo" width={270} height={390} className="h-9 w-auto" />
      <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Counsellor space</p>
    </div>
  );
}

export function WorkspaceShell({ fullName, initials, college, badges, children }: {
  fullName: string; initials: string; college: string; badges: Badges; children: React.ReactNode;
}) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const crisisClose = useRef<HTMLButtonElement>(null);

  const current = NAV.find((n) => (n.href === "/counsellor" ? path === n.href : path.startsWith(n.href)))?.label ?? "Dashboard";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawer(false); setMenu(false); setCrisis(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (crisis) crisisClose.current?.focus(); }, [crisis]);

  return (
    <div className="min-h-dvh bg-ilo-bg text-ilo-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-ilo-plum/10 bg-white px-3 py-5 lg:flex">
        <Brand />
        <NavList badges={badges} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ilo-deep/40" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 w-64 bg-white px-3 py-5 shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-2 top-2 p-2 text-ilo-ink/70"><X className="h-5 w-5" /></button>
            <Brand />
            <NavList badges={badges} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ilo-plum/10 bg-white/85 px-4 backdrop-blur lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="-ml-2 p-2 text-ilo-ink lg:hidden"><Menu className="h-5 w-5" /></button>
          <p className="min-w-0 flex-1 truncate text-xs text-ilo-ink/60">Counsellor space <span className="mx-1">/</span> <span className="font-semibold text-ilo-plum">{current}</span></p>

          <label className="hidden h-9 w-64 items-center gap-2 rounded-full border border-ilo-plum/10 bg-white px-3 text-xs text-ilo-ink/50 md:flex">
            <Search className="h-3.5 w-3.5" />
            <input disabled aria-label="Search (coming soon)" placeholder="Search students, notes…" title="Search arrives with the Students screen" className="w-full bg-transparent outline-none placeholder:text-ilo-ink/40" />
          </label>

          <div className="hidden items-center rounded-full border border-ilo-plum/10 bg-white p-0.5 text-[11px] font-semibold sm:flex" aria-label="Language">
            <span className="rounded-full bg-ilo-blush px-2.5 py-1 text-ilo-plum">EN</span>
            <span title="Hindi is coming soon" className="px-2.5 py-1 text-ilo-ink/40">हि</span>
          </div>

          <Link href="/counsellor/inbox" aria-label={badges.inbox > 0 ? `Inbox, ${badges.inbox} unread` : "Inbox"} className="relative p-2 text-ilo-ink">
            <Bell className="h-5 w-5" />
            {badges.inbox > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ilo-crisis" />}
          </Link>

          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ilo-blush text-xs font-bold text-ilo-plum ring-1 ring-ilo-plum/15">{initials}</button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 top-11 z-20 w-60 rounded-2xl border border-ilo-plum/10 bg-white p-3 shadow-xl">
                  <p className="text-sm font-bold text-ilo-plum">{fullName}</p>
                  <p className="mb-2 text-[11px] leading-snug text-ilo-ink/70">{college}</p>
                  <form action="/auth/counsellor-signout" method="post">
                    <button type="submit" role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-ilo-ink hover:bg-ilo-blush/60"><LogOut className="h-4 w-4" /> Sign out</button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>

        {children}
      </div>

      <button type="button" onClick={() => setCrisis(true)} className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-ilo-crisis px-4 py-2.5 text-xs font-bold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-crisis">
        <ShieldAlert className="h-4 w-4" /> Crisis protocol
      </button>

      {crisis && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ilo-deep/50" onClick={() => setCrisis(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="crisis-title" className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <button ref={crisisClose} type="button" onClick={() => setCrisis(false)} aria-label="Close" className="absolute right-3 top-3 p-2 text-ilo-ink/70"><X className="h-5 w-5" /></button>
            <h2 id="crisis-title" className="font-display text-xl text-ilo-plum">Crisis protocol</h2>
            <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">If someone may be in immediate danger, follow your institution&apos;s crisis protocol and call for help now.</p>
            <ul className="mt-4 space-y-2">
              {[
                { name: "Emergency services", num: "112", tel: "112" },
                { name: "Tele-MANAS (free, 24×7)", num: "14416", tel: "14416" },
                { name: "KIRAN mental health helpline", num: "1800-599-0019", tel: "18005990019" },
              ].map((h) => (
                <li key={h.tel}>
                  <a href={`tel:${h.tel}`} className="flex items-center justify-between rounded-xl border border-ilo-plum/15 px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum">
                    <span className="font-semibold text-ilo-plum">{h.name}</span>
                    <span className="flex items-center gap-1.5 font-bold text-ilo-crisis"><Phone className="h-3.5 w-3.5" /> {h.num}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-ilo-ink/60">Your institution&apos;s own protocol will appear here once it is added.</p>
          </div>
        </div>
      )}
    </div>
  );
}
