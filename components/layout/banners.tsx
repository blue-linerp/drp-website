"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Wrench, Megaphone } from "lucide-react";

export function AnnouncementBar({ id, text, href }: { id: string; text: string; href?: string }) {
  const key = `drp-announcement-${id}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);
  if (hidden) return null;
  return (
    <div data-announcement className="relative z-[55] bg-accent text-white">
      <div className="container flex min-h-10 items-center justify-center gap-3 py-2 pr-10 text-center text-sm font-medium">
        <Megaphone size={16} aria-hidden className="shrink-0" />
        {href ? (
          <Link href={href} className="underline decoration-white/50 underline-offset-4 hover:decoration-white">
            {text}
          </Link>
        ) : (
          <span>{text}</span>
        )}
        <button
          type="button"
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/15"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(key, "1");
            } catch {}
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function MaintenanceBanner({ message }: { message: string }) {
  return (
    <div role="status" className="relative z-[55] border-b border-status-checking/30 bg-[#2a1f05] text-[#ffd27a]">
      <div className="container flex min-h-10 items-center justify-center gap-3 py-2 text-center text-sm">
        <Wrench size={16} aria-hidden className="shrink-0" />
        <span>
          <strong className="font-semibold">Maintenance:</strong> {message}
        </span>
      </div>
    </div>
  );
}
