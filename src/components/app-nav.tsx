"use client";

import clsx from "clsx";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Gauge,
  History,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { canViewInsights } from "@/lib/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const links = [
  { href: "/", label: "Dashboard", icon: Gauge },
  {
    href: "/insights",
    label: "Insights",
    icon: BarChart3,
    showFor: canViewInsights,
  },
  { href: "/entry", label: "Entry", icon: ClipboardList },
  { href: "/setup", label: "Setup", icon: CalendarDays },
  { href: "/history", label: "History", icon: History },
  { href: "/admin", label: "Admin", icon: Settings },
];

type AppNavProps = {
  role?: Role | null;
};

export function AppNav({ role }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPath =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const visibleLinks = links.filter(
    (link) => !link.showFor || (role ? link.showFor(role) : false),
  );

  async function handleSignOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black shadow-sm">
            <Image
              src="/we-icon-192.png"
              alt="Wichita Endodontics logo"
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              WE Bonus Tracker
            </p>
            <p className="truncate text-xs text-muted">Wichita Endodontics</p>
          </div>
        </Link>

        {isAuthPath ? null : (
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                    active
                      ? "bg-ink text-white"
                      : "text-muted hover:bg-background hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {isAuthPath ? null : (
          <>
            <button
              type="button"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-background hover:text-ink md:ml-1"
              aria-label="Notification settings"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              href="/account"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-background hover:text-ink"
              aria-label="Account"
              title="Account"
            >
              <UserCircle className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-background hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {isAuthPath ? null : (
        <nav
          className="grid border-t border-line bg-panel md:hidden"
          style={{
            gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
