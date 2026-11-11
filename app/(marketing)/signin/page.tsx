import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

function safePath(p: string | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/profile";
}

const ERRORS: Record<string, string> = {
  AccessDenied: "Sign-in was cancelled or denied.",
  Configuration: "Discord sign-in isn't configured correctly. Please tell the team.",
  Verification: "That sign-in link expired. Try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const callbackUrl = safePath(searchParams.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  return (
    <section className="container flex min-h-[80vh] items-center justify-center pb-16 pt-32">
      <div className="plate chamfer-lg w-full max-w-md p-8 text-center md:p-10">
        <p className="eyebrow justify-center">Account</p>
        <h1 className="mt-4 text-5xl">Sign in.</h1>
        <p className="mt-4 text-white/65">
          {site.shortName} accounts use Discord. We read your username, avatar and server roles to check your whitelist access.
        </p>
        {searchParams.error && (
          <p role="alert" className="mt-5 bg-accent/10 px-4 py-3 text-sm text-accent-text">
            {ERRORS[searchParams.error] ?? "Something went wrong signing in. Please try again."}
          </p>
        )}
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: callbackUrl });
          }}
        >
          <Button type="submit" size="lg" className="w-full bg-[#5865F2] hover:bg-[#4752c4] hover:shadow-[0_8px_30px_-6px_rgba(88,101,242,.7)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
            </svg>
            Sign in with Discord
          </Button>
        </form>
        <p className="mt-6 text-xs text-white/40">
          By signing in you agree to our <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}
