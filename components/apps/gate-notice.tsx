"use client";
import { HexIcon } from "@/components/ui/hexagon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

interface Gate {
  ok: false;
  code: string;
  message: string;
  until?: string;
  applicationId?: string;
}

export function GateNotice({ gate }: { gate: Gate }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const recheck = async () => {
    setBusy(true);
    await fetch("/api/me?sync=1", { cache: "no-store" }).catch(() => null);
    router.refresh();
    setBusy(false);
  };

  return (
    <div className="plate chamfer-lg p-8 md:p-10" role="alert">
      <div className="flex items-start gap-4">
        <HexIcon size={56}>
          <Lock size={22} aria-hidden />
        </HexIcon>
        <div>
          <h2 className="text-3xl">You can&apos;t apply yet.</h2>
          <p className="mt-3 text-white/70">{gate.message}</p>
          {gate.until && (
            <p className="mt-2 text-white/60">
              Available from <strong className="text-white">{formatDate(gate.until, { dateStyle: "long" })}</strong>.
            </p>
          )}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {gate.code === "NOT_IN_GUILD" && (
          <>
            <ButtonLink href={site.discordInvite}>Join the Discord</ButtonLink>
            <Button variant="secondary" onClick={recheck} disabled={busy}>
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden /> I&apos;ve joined, check again
            </Button>
          </>
        )}
        {(gate.code === "MISSING_ROLE" || gate.code === "NOT_WHITELISTED") && (
          <>
            {gate.code === "NOT_WHITELISTED" && <ButtonLink href="/applications/whitelist">Apply for whitelist</ButtonLink>}
            <Button variant="secondary" onClick={recheck} disabled={busy}>
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden /> Check again
            </Button>
          </>
        )}
        {gate.code === "PENDING_EXISTS" && gate.applicationId && (
          <ButtonLink href={`/profile/applications/${gate.applicationId}`}>View your application</ButtonLink>
        )}
        {gate.code === "ALREADY_WHITELISTED" && <ButtonLink href="/queue">Enter the city</ButtonLink>}
        {gate.code === "BANNED" && <ButtonLink href="/support">Appeal through support</ButtonLink>}
        <ButtonLink href="/applications" variant="ghost">
          Back to applications
        </ButtonLink>
      </div>
    </div>
  );
}
