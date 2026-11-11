import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function FeatureRow({
  index,
  eyebrow,
  title,
  body,
  cta,
  href,
  image,
  alt,
  flip,
}: {
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <Reveal className={cn("relative", flip && "md:order-2")}>
        <figure className="chamfer chamfer-lg group relative aspect-[4/3] overflow-hidden bg-ink-700">
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            unoptimized={image.endsWith(".svg")}
            className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          <figcaption className="absolute bottom-5 left-5 font-digits text-xs font-bold uppercase tracking-[0.3em] text-white/80">
            <span className="text-accent">{String(index).padStart(2, "0")}</span> / {eyebrow}
          </figcaption>
        </figure>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-4 text-4xl leading-[0.95] md:text-5xl">{title}</h3>
        <p className="mt-5 max-w-md text-white/65">{body}</p>
        <ButtonLink href={href} variant="secondary" className="mt-8">
          {cta} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      </Reveal>
    </div>
  );
}
