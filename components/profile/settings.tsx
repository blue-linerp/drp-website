"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border-b border-white/5 py-4">
      <span>
        <span className="block font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-sm text-white/50">{help}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 bg-white/15 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink" />
        <span className="absolute left-1 top-1 h-4 w-4 bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function ProfileSettings({ dmNotifications, isProfilePublic }: { dmNotifications: boolean; isProfilePublic: boolean }) {
  const router = useRouter();
  const [dm, setDm] = useState(dmNotifications);
  const [pub, setPub] = useState(isProfilePublic);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const update = async (patch: { dmNotifications?: boolean; isProfilePublic?: boolean }) => {
    setMsg(null);
    const r = await fetch("/api/me/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(r.ok ? "Saved." : "Couldn't save. Try again.");
    if (r.ok) router.refresh();
  };

  const remove = async () => {
    setDeleting(true);
    const r = await fetch("/api/me/settings", { method: "DELETE" });
    if (r.ok) window.location.href = "/";
    else {
      setDeleting(false);
      setMsg((await r.json().catch(() => ({}))).error ?? "Couldn't delete your account.");
    }
  };

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl">Settings</h2>
        <p className="text-sm text-white/50" aria-live="polite">
          {msg}
        </p>
      </div>
      <div className="mt-2">
        <Toggle
          label="Discord DM notifications"
          help="Get a DM from our bot when an application is decided or an interview is scheduled."
          checked={dm}
          onChange={(v) => {
            setDm(v);
            void update({ dmNotifications: v });
          }}
        />
        <Toggle
          label="Public profile"
          help="Let anyone see your name, avatar, badges, creator links and characters."
          checked={pub}
          onChange={(v) => {
            setPub(v);
            void update({ isProfilePublic: v });
          }}
        />
      </div>
      <div className="mt-8">
        <h3 className="text-xl">Delete account</h3>
        <p className="mt-1 text-sm text-white/50">
          Removes your account, applications and linked identifiers. Active bans are kept so they can still be enforced. This can&apos;t be undone.
        </p>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button variant="danger" size="sm" className="mt-4">
              Delete my account
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className="plate chamfer-lg fixed left-1/2 top-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-8">
              <Dialog.Title className="font-display text-3xl font-bold uppercase text-white">Delete account?</Dialog.Title>
              <Dialog.Description className="mt-3 text-white/65">
                Type <strong className="text-white">DELETE</strong> to confirm. You&apos;ll lose your whitelist and applications.
              </Dialog.Description>
              <input className="input mt-5" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" />
              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.Close>
                <Button variant="danger" disabled={confirm !== "DELETE" || deleting} onClick={remove}>
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </Card>
  );
}
