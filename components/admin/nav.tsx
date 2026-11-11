"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Blocks, FileText, Gauge, Gavel, Inbox, ListOrdered, Scroll, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { gauge: Gauge, inbox: Inbox, blocks: Blocks, users: Users, "list-ordered": ListOrdered, gavel: Gavel, "file-text": FileText, settings: Settings, scroll: Scroll };

export function AdminNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="mt-4">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((i) => {
          const Icon = ICONS[i.icon];
          const base = i.href.startsWith("/admin/content") ? "/admin/content" : i.href;
          const active = base === "/admin" ? pathname === "/admin" : pathname.startsWith(base);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "chamfer chamfer-sm flex items-center gap-3 whitespace-nowrap px-3.5 py-2.5 text-sm transition-colors",
                  active ? "bg-accent/15 text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Icon size={17} className={active ? "text-accent" : ""} aria-hidden />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
