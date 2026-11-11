"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useMe } from "@/components/use-me";

interface Mine {
  id: string;
  typeId: string;
  status: string;
}

let minePromise: Promise<Mine[]> | null = null;
function loadMine() {
  minePromise ??= fetch("/api/applications", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { applications: [] }))
    .then((j: { applications: Mine[] }) => j.applications)
    .catch(() => []);
  return minePromise;
}

const OPEN = ["PENDING", "UNDER_REVIEW", "INTERVIEW"];

/** Apply / View status / Closed, depending on the signed-in user's applications. */
export function ApplyAction({ slug, typeId, open }: { slug: string; typeId: string; open: boolean }) {
  const { me, loading } = useMe();
  const [mine, setMine] = useState<Mine[] | null>(null);

  useEffect(() => {
    if (me) void loadMine().then(setMine);
  }, [me]);

  const existing = mine?.find((a) => a.typeId === typeId && (OPEN.includes(a.status) || a.status === "ACCEPTED"));
  if (existing)
    return (
      <ButtonLink href={`/profile/applications/${existing.id}`} variant="secondary" className="w-full">
        View status
      </ButtonLink>
    );
  if (!open)
    return (
      <Button disabled variant="secondary" className="w-full">
        Closed
      </Button>
    );
  return (
    <ButtonLink
      href={!loading && !me ? `/signin?callbackUrl=${encodeURIComponent(`/applications/${slug}`)}` : `/applications/${slug}`}
      className="w-full"
    >
      Apply <ArrowRight size={16} aria-hidden />
    </ButtonLink>
  );
}
