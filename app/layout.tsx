import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBar, MaintenanceBanner } from "@/components/layout/banners";
import { MeProvider } from "@/components/use-me";
import { getPublicSettings } from "@/lib/content";

// ox_lib "Abstract" style: Chakra Petch for everything (headings, body, labels), mono for numbers.
const chakra = Chakra_Petch({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], weight: ["500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | GTA V Roleplay`, template: `%s | ${site.name}` },
  description: `A new face. A familiar city. A story that goes wherever you take it. Apply for whitelist and make yourself at home in ${site.shortName}.`,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0A0A0C", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let settings: Awaited<ReturnType<typeof getPublicSettings>> | null = null;
  try {
    settings = await getPublicSettings();
  } catch {
    settings = null;
  }
  return (
    <html lang="en" className={`${chakra.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main-content"
          className="chamfer chamfer-sm fixed left-4 top-4 z-[100] -translate-y-24 bg-accent px-4 py-3 font-digits text-sm font-bold uppercase tracking-widest text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <MeProvider>
          <Header
            banners={
              (settings?.maintenance.enabled || (settings?.announcement.enabled && settings.announcement.text)) && (
                <>
                  {settings?.maintenance.enabled && <MaintenanceBanner message={settings.maintenance.message} />}
                  {settings?.announcement.enabled && settings.announcement.text && (
                    <AnnouncementBar id={settings.announcement.id} text={settings.announcement.text} href={settings.announcement.href || undefined} />
                  )}
                </>
              )
            }
          />
          <main id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <Footer />
          {/* Room for the floating mobile tab bar */}
          <div aria-hidden className="h-24 lg:hidden" />
        </MeProvider>
      </body>
    </html>
  );
}
