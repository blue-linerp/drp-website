"use client";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container flex min-h-[80vh] flex-col justify-center pt-28">
      <p className="eyebrow">Error 500</p>
      <h1 className="mt-5 max-w-3xl text-hero font-bold">The city hit a pothole.</h1>
      <p className="mt-6 max-w-md text-lg text-white/70">Something went wrong on our side. Try again, and if it keeps happening let the team know.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-white/40">Reference: {error.digest}</p>}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>Try again</Button>
        <ButtonLink href="/support" variant="secondary" size="lg">Get support</ButtonLink>
      </div>
    </section>
  );
}
