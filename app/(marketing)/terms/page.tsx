import { LegalPageView, legalMetadata } from "@/components/content/legal-page";

export const metadata = legalMetadata("terms");

export default function Page() {
  return <LegalPageView page="terms" />;
}
