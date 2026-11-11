import { LegalPageView, legalMetadata } from "@/components/content/legal-page";

export const metadata = legalMetadata("privacy");

export default function Page() {
  return <LegalPageView page="privacy" />;
}
