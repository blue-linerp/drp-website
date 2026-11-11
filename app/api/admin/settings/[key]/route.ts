import { NextResponse } from "next/server";
import { ApiError, parseBody, route } from "@/lib/api";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revalidateContent } from "@/lib/content";
import { setSetting, settingSchemas, type SettingKey } from "@/lib/settings";
import type { Action } from "@/lib/permissions";

/** Announcement / maintenance / home copy are site settings (ADMIN); rules meta + creators meta are content. */
const PERM: Record<SettingKey, Action> = {
  announcement: "settings.manage",
  maintenance: "settings.manage",
  home: "content.manage",
  rulesMeta: "content.manage",
  creatorsMeta: "content.manage",
};

export const PUT = route<{ params: { key: string } }>(async (req, { params }) => {
  if (!(params.key in settingSchemas)) throw new ApiError(404, "Unknown setting");
  const key = params.key as SettingKey;
  const actor = await requireStaff(PERM[key]);
  const value = await parseBody(req, settingSchemas[key]);
  await setSetting(key, value as never);
  await audit(actor.id, `settings.${key}`, "SiteSetting", key, {});
  revalidateContent("settings");
  if (key === "rulesMeta") revalidateContent("rules");
  if (key === "creatorsMeta") revalidateContent("creators");
  return NextResponse.json({ ok: true });
});
