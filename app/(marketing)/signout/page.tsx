import type { Metadata } from "next";
import { signOut } from "@/auth";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign out", robots: { index: false } };

export default function SignOutPage() {
  return (
    <section className="container flex min-h-[70vh] items-center justify-center pb-16 pt-32">
      <div className="plate chamfer-lg w-full max-w-md p-8 text-center md:p-10">
        <h1 className="text-5xl">Sign out?</h1>
        <p className="mt-4 text-white/65">You can sign back in with Discord at any time.</p>
        <form
          className="mt-8 grid gap-3"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" size="lg">
            Sign out
          </Button>
          <ButtonLink href="/profile" variant="ghost">
            Cancel
          </ButtonLink>
        </form>
      </div>
    </section>
  );
}
