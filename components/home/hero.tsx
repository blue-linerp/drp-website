import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";

export function Hero({ image, video, title, subtitle }: { image: string; video?: string; title: string; subtitle: string }) {
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[100svh] items-end overflow-hidden pb-20 pt-32 md:items-center md:pb-0">
      <div className="absolute inset-0" aria-hidden>
        {video ? (
          <video className="h-full w-full object-cover motion-reduce:hidden" src={video} poster={image} autoPlay muted loop playsInline />
        ) : null}
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized={image.endsWith(".svg")}
          className={`animate-kenburns object-cover ${video ? "hidden motion-reduce:block" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
      </div>
      <div className="container relative">
        <p className="eyebrow">{site.name}</p>
        <h1 id="hero-title" className="mt-6 max-w-5xl text-hero font-bold">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/75 md:text-xl">{subtitle}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/applications" size="lg">
            Apply to {site.shortName}
          </ButtonLink>
          <ButtonLink href="#city" variant="secondary" size="lg">
            Explore the city <ArrowDown size={16} aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
