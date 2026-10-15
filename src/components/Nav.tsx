"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

type Item = { href: string; label: string; icon: string; roles: Role[] };

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: "🏠", roles: ["admin", "pastor"] },
  { href: "/members", label: "Members", icon: "👥", roles: ["admin", "pastor", "leader"] },
  { href: "/checkin", label: "Check-in", icon: "✅", roles: ["admin", "pastor", "leader", "usher"] },
  { href: "/groups", label: "Groups", icon: "🫂", roles: ["admin", "pastor", "leader"] },
  { href: "/events", label: "Services", icon: "📅", roles: ["admin", "pastor", "leader"] },
  { href: "/settings", label: "Settings", icon: "⚙️", roles: ["admin"] },
];

export function Nav({ role, name, signOut }: { role: Role; name: string; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.roles.includes(role));
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Top bar */}
      <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-brand-700">Door of Hope</Link>
          <nav className="hidden gap-1 md:flex" aria-label="Main">
            {items.map((i) => (
              <Link key={i.href} href={i.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${isActive(i.href) ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"}`}>
                {i.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="flex items-center gap-2">
            <span className="hidden text-sm text-gray-600 sm:inline">{name}</span>
            {role === "admin" && (
              <Link href="/settings" className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 md:hidden">
                Settings
              </Link>
            )}
            <button className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">Sign out</button>
          </form>
        </div>
      </header>

      {/* Bottom tab bar on phones */}
      <nav aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {items.slice(0, 5).map((i) => (
            <li key={i.href} className="flex-1">
              <Link href={i.href}
                className={`flex min-h-14 flex-col items-center justify-center text-xs ${isActive(i.href) ? "font-semibold text-brand-700" : "text-gray-600"}`}
                aria-current={isActive(i.href) ? "page" : undefined}>
                <span aria-hidden className="text-lg leading-none">{i.icon}</span>
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
