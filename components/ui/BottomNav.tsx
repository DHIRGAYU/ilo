"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Home, User } from "lucide-react";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[375px] border-t border-ilo-plum/10 bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? "text-ilo-plum" : "text-ilo-ink/60"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
