import Link from "next/link";
import { site } from "@/lib/site";
import { HexIcon } from "@/components/ui/hexagon";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={`${site.name} home`}>
      <HexIcon size={44} className="transition-transform group-hover:-translate-y-0.5">
        <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{site.logoText}</span>
      </HexIcon>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-bold uppercase tracking-wide text-white">{site.shortName}</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Roleplay</span>
        </span>
      )}
    </Link>
  );
}
