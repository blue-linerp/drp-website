import { readLegal, type LegalPage } from "@/lib/legal";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Markdown } from "./markdown";

export function legalMetadata(page: LegalPage) {
  const { title } = readLegal(page);
  return { title, alternates: { canonical: `/${page}` } };
}

export function LegalPageView({ page }: { page: LegalPage }) {
  const { title, updated, body } = readLegal(page);
  return (
    <>
      <PageHeader eyebrow="Legal" title={`${title}.`} subtitle={`Last updated ${formatDate(updated, { dateStyle: "long" })}`} />
      <div className="container max-w-3xl py-12 md:py-16">
        <Markdown>{body}</Markdown>
      </div>
    </>
  );
}
