"use client";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 text-white/60 underline-offset-4 hover:text-white hover:underline">
      <Printer size={15} aria-hidden /> Print the rules
    </button>
  );
}

export function Changelog({ entries }: { entries: { date: string; text: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible className="plate no-print mt-12">
      <Accordion.Item value="log">
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-6 py-5 text-left md:px-8">
            <span className="font-display text-2xl font-bold uppercase text-white">Changelog</span>
            <ChevronDown size={18} className="text-white/50 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden px-6 pb-6 md:px-8">
          <ol className="space-y-3 border-l border-white/10 pl-5">
            {entries.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[25px] top-2 hex h-2 w-2 bg-accent" aria-hidden />
                <p className="font-mono text-xs text-white/40">{formatDate(e.date, { dateStyle: "medium" })}</p>
                <p className="text-white/75">{e.text}</p>
              </li>
            ))}
          </ol>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
