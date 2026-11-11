"use client";
import { useState } from "react";
import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import { ArrowUpRight, ChevronDown, FileText } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { cn, formatDate } from "@/lib/utils";

export interface HistoryApp {
  id: string;
  title: string;
  reference: string;
  status: ApplicationStatus;
  submittedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  interviewAt: string | null;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Awaiting review", match: (s: ApplicationStatus) => s === "PENDING" || s === "UNDER_REVIEW" || s === "INTERVIEW" },
  { key: "accepted", label: "Accepted", match: (s: ApplicationStatus) => s === "ACCEPTED" },
  { key: "denied", label: "Rejected", match: (s: ApplicationStatus) => s === "DENIED" },
] as const;

export function AppHistory({ apps }: { apps: HistoryApp[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [open, setOpen] = useState<string | null>(null);
  const current = TABS.find((t) => t.key === tab)!;
  const list = apps.filter((a) => current.match(a.status));

  return (
    <div>
      <div role="tablist" aria-label="Filter applications" className="flex flex-wrap gap-1 border-b border-line pb-4">
        {TABS.map((t) => {
          const n = apps.filter((a) => t.match(a.status)).length;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "chamfer chamfer-sm flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                active ? "bg-accent/15 text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {t.label} <span className={cn("font-mono text-xs", active ? "text-accent-text" : "text-white/35")}>{n}</span>
            </button>
          );
        })}
      </div>

      {list.length ? (
        <ul>
          {list.map((a) => {
            const expanded = open === a.id;
            return (
              <li key={a.id} className="border-b border-line">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`app-${a.id}`}
                  onClick={() => setOpen(expanded ? null : a.id)}
                  className="flex w-full items-center gap-4 py-6 text-left"
                >
                  <FileText size={18} className="shrink-0 text-white/45" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{a.title}</span>
                    <span className="mt-1 block text-sm text-white/50">{formatDate(a.submittedAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </span>
                  <StatusChip status={a.status} />
                  <ChevronDown size={16} className={cn("shrink-0 text-white/45 transition-transform", expanded && "rotate-180")} aria-hidden />
                </button>
                {expanded && (
                  <div id={`app-${a.id}`} className="-mt-2 pb-6 pl-[34px]">
                    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-white/45">Reference</dt>
                        <dd className="font-mono text-white">{a.reference}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-white/45">{a.decidedAt ? "Decided" : a.interviewAt ? "Interview" : "Status"}</dt>
                        <dd className="text-white">
                          {a.decidedAt
                            ? formatDate(a.decidedAt)
                            : a.interviewAt
                              ? formatDate(a.interviewAt, { dateStyle: "medium", timeStyle: "short" })
                              : "Waiting for a reviewer"}
                        </dd>
                      </div>
                    </dl>
                    {a.decisionReason && <p className="mt-3 whitespace-pre-wrap text-sm text-white/70 [overflow-wrap:anywhere]">{a.decisionReason}</p>}
                    <Link href={`/profile/applications/${a.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:text-white">
                      View full application <ArrowUpRight size={14} aria-hidden />
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-10 text-white/50">
          {tab === "all" ? (
            <>
              No applications yet.{" "}
              <Link href="/applications" className="text-accent-text underline underline-offset-4">
                Find one to apply for
              </Link>
              .
            </>
          ) : (
            "Nothing here."
          )}
        </p>
      )}
    </div>
  );
}
