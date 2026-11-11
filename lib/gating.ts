import type { ApplicationStatus } from "@prisma/client";
import { isOpenStatus } from "./status-machine";

export interface GateUser {
  inGuild: boolean;
  discordCreatedAt: Date;
  roleIds: string[];
  whitelisted: boolean;
  activeBan?: { reason: string; expiresAt: Date | null } | null;
}

export interface GateType {
  id: string;
  isOpen: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  minDiscordAgeDays: number;
  requiredRoleIds: string[];
  requiresWhitelist: boolean;
  grantsWhitelist: boolean;
  cooldownDays: number;
}

export interface PriorApp {
  typeId: string;
  status: ApplicationStatus;
  decidedAt: Date | null;
  id?: string;
}

export type GateCode =
  | "CLOSED"
  | "NOT_YET_OPEN"
  | "PAST_CLOSE"
  | "BANNED"
  | "NOT_IN_GUILD"
  | "ACCOUNT_TOO_NEW"
  | "NOT_WHITELISTED"
  | "MISSING_ROLE"
  | "ALREADY_WHITELISTED"
  | "PENDING_EXISTS"
  | "COOLDOWN";

export type GateResult =
  | { ok: true }
  | { ok: false; code: GateCode; message: string; until?: Date; applicationId?: string; missingRoleIds?: string[] };

const DAY = 86_400_000;

export function checkEligibility(user: GateUser, type: GateType, prior: PriorApp[], now = new Date()): GateResult {
  if (!type.isOpen) return { ok: false, code: "CLOSED", message: "This application is closed right now." };
  if (type.opensAt && type.opensAt > now)
    return { ok: false, code: "NOT_YET_OPEN", message: "This application isn't open yet.", until: type.opensAt };
  if (type.closesAt && type.closesAt <= now)
    return { ok: false, code: "PAST_CLOSE", message: "This application has closed." };

  if (user.activeBan && (!user.activeBan.expiresAt || user.activeBan.expiresAt > now))
    return {
      ok: false,
      code: "BANNED",
      message: "Your account is banned, so you can't apply. You can appeal through support.",
      until: user.activeBan.expiresAt ?? undefined,
    };

  if (!user.inGuild)
    return { ok: false, code: "NOT_IN_GUILD", message: "Join our Discord server first, then come back and try again." };

  const ageDays = Math.floor((now.getTime() - user.discordCreatedAt.getTime()) / DAY);
  if (ageDays < type.minDiscordAgeDays) {
    const until = new Date(user.discordCreatedAt.getTime() + type.minDiscordAgeDays * DAY);
    return {
      ok: false,
      code: "ACCOUNT_TOO_NEW",
      message: `Your Discord account must be at least ${type.minDiscordAgeDays} days old to apply.`,
      until,
    };
  }

  if (type.grantsWhitelist && user.whitelisted)
    return { ok: false, code: "ALREADY_WHITELISTED", message: "You're already whitelisted. See you in the city." };

  if (type.requiresWhitelist && !user.whitelisted)
    return { ok: false, code: "NOT_WHITELISTED", message: "You need to be whitelisted before you can apply for this." };

  const missing = type.requiredRoleIds.filter((r) => !user.roleIds.includes(r));
  if (missing.length)
    return {
      ok: false,
      code: "MISSING_ROLE",
      message: "You don't have the Discord role this application requires.",
      missingRoleIds: missing,
    };

  const mine = prior.filter((p) => p.typeId === type.id);
  const open = mine.find((p) => isOpenStatus(p.status));
  if (open)
    return {
      ok: false,
      code: "PENDING_EXISTS",
      message: "You already have an application of this type in progress.",
      applicationId: open.id,
    };

  if (type.cooldownDays > 0) {
    const lastDenied = mine
      .filter((p) => p.status === "DENIED" && p.decidedAt)
      .sort((a, b) => b.decidedAt!.getTime() - a.decidedAt!.getTime())[0];
    if (lastDenied) {
      const until = new Date(lastDenied.decidedAt!.getTime() + type.cooldownDays * DAY);
      if (until > now)
        return { ok: false, code: "COOLDOWN", message: "You can reapply once your cooldown ends.", until };
    }
  }

  return { ok: true };
}
