import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { accessFor } from "@/lib/session";
import { LEVEL_LABEL } from "@/lib/permissions";
import { supporterActive } from "@/lib/priority";
import { discordAvatarUrl, formatDate } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/misc";
import { CreatorLinks } from "@/components/content/creator-links";

export const dynamic = "force-dynamic";

async function load(discordId: string) {
  if (!/^\d{17,20}$/.test(discordId)) return null;
  const user = await db.user.findUnique({ where: { discordId }, include: { supporterTier: true, creator: true, gameCharacters: { orderBy: { playtimeMinutes: "desc" }, select: { id: true, firstname: true, lastname: true, jobLabel: true, jobGrade: true } } } });
  return user?.isProfilePublic ? user : null;
}

export async function generateMetadata({ params }: { params: { discordId: string } }): Promise<Metadata> {
  const u = await load(params.discordId);
  return { title: u ? u.globalName || u.username : "Profile" };
}

export default async function PublicProfile({ params }: { params: { discordId: string } }) {
  const user = await load(params.discordId);
  if (!user) notFound();
  const access = accessFor(user);
  // Public view: names and jobs only. Money, phone and playtime stay private.
  const characters = user.gameCharacters.map((c) => ({ id: c.id, name: `${c.firstname} ${c.lastname}`.trim(), job: [c.jobLabel, c.jobGrade].filter(Boolean).join(" · ") }));
  return (
    <div className="container max-w-3xl pb-24 pt-32">
      <header className="flex items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={discordAvatarUrl(user.discordId, user.avatar, 256)} alt="" width={96} height={96} className="chamfer h-24 w-24" />
        <div>
          <h1 className="text-5xl">{user.globalName || user.username}</h1>
          <p className="mt-1 text-white/50">In the city since {formatDate(user.whitelistedAt ?? user.createdAt, { month: "long", year: "numeric" })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.whitelisted && <Badge tone="green">Whitelisted</Badge>}
            {user.supporterTier && supporterActive(user.supporterUntil) && (
              <Badge>
                <span style={{ color: user.supporterTier.color }}>{user.supporterTier.name}</span>
              </Badge>
            )}
            {access.level && <Badge tone="accent">{LEVEL_LABEL[access.level]}</Badge>}
            {user.creator?.approved && <Badge tone="blue">Creator</Badge>}
          </div>
        </div>
      </header>
      {user.creator?.approved && (
        <Card className="mt-10">
          <h2 className="text-2xl">Watch</h2>
          <CreatorLinks creator={user.creator} className="mt-4" />
        </Card>
      )}
      <Card className="mt-6">
        <h2 className="text-2xl">Characters</h2>
        {characters.length ? (
          <ul className="mt-4 divide-y divide-white/5">
            {characters.map((c) => (
              <li key={c.id} className="flex justify-between py-2.5">
                <span className="font-semibold text-white">{c.name}</span>
                <span className="text-white/55">{c.job || ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-white/50">No characters to show yet.</p>
        )}
      </Card>
    </div>
  );
}
