"use client";

import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

/** Spinner on the clicked tab while its page loads (the current page stays visible). */
function Pending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className={cn("size-3.5 animate-spin text-muted-foreground", className)} aria-label="Loading" /> : null;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, tint }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
              active && "bg-background text-foreground shadow-sm ring-1 ring-border",
            )}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-md transition-colors",
                active ? "text-white shadow-sm" : "bg-background ring-1 ring-border group-hover:ring-transparent",
              )}
              style={active ? { backgroundColor: tint } : { color: tint }}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            {label}
            <Pending className="ml-auto" />
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon, tint }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                  active && "font-semibold text-foreground",
                )}
              >
                <span
                  className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "text-white")}
                  style={active ? { backgroundColor: tint } : undefined}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="inline-flex items-center gap-1">
                  {label}
                  <Pending className="size-3" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
