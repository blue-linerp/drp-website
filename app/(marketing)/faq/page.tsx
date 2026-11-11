import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getFaq } from "@/lib/content";
import { PageHeader } from "@/components/ui/misc";
import { Markdown } from "@/components/content/markdown";
import { FaqBrowser } from "@/components/content/faq-browser";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Answers to common questions about ${site.shortName}.`,
};
export const revalidate = 3600;

export default async function FaqPage() {
  const items = await getFaq();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader eyebrow="FAQ" title="Good questions. Straight answers." subtitle={`Answers to common questions about ${site.shortName}.`} />
      <div className="container max-w-4xl py-12 md:py-16">
        <FaqBrowser
          items={items.map((i) => ({ slug: i.slug, category: i.category, question: i.question, text: `${i.question} ${i.answer}`.toLowerCase(), node: <Markdown>{i.answer}</Markdown> }))}
        />
        <p className="mt-12 text-center text-white/60">
          Still looking for an answer?{" "}
          <Link href="/support" className="font-semibold text-white underline decoration-accent underline-offset-4 hover:text-accent-text">
            Talk to the team ↗
          </Link>
        </p>
      </div>
    </>
  );
}
