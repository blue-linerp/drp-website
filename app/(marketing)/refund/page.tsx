import { LegalPageView, legalMetadata } from "@/components/content/legal-page";

export const metadata = legalMetadata("refund");

export default function Page() {
  return <LegalPageView page="refund" />;
}
