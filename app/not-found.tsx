import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-24">
      <div className="absolute inset-0" aria-hidden>
        <Image src="/images/feature-path.svg" alt="" fill sizes="100vw" unoptimized className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      </div>
      <div className="container relative">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-5 max-w-3xl text-hero font-bold">You took a wrong turn.</h1>
        <p className="mt-6 max-w-md text-lg text-white/70">This street doesn&apos;t go anywhere. Let&apos;s get you back to somewhere familiar.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/" size="lg">Back to the city</ButtonLink>
          <ButtonLink href="/support" variant="secondary" size="lg">Get support</ButtonLink>
        </div>
      </div>
    </section>
  );
}
