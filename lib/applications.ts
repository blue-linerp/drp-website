import "server-only";
import type { Application, ApplicationStatus, ApplicationType, Prisma, User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { site } from "./site";
import { ApiError } from "./api";
import { audit } from "./audit";
import { checkEligibility, type GateResult } from "./gating";
import { canTransition } from "./status-machine";
import { cleanAnswers, parseQuestions, validateAnswers, type Answers } from "./questions";
import { addRole, botConfigured, COLORS, postWebhook, sendDM, type Embed } from "./discord";
import { setWhitelist } from "./whitelist";
import { activeBan } from "./session";
import { makeReference } from "./utils";

export interface HistoryEntry {
  at: string;
  by: string | null;
  byName?: string;
  action: string;
  from?: ApplicationStatus;
  to?: ApplicationStatus;
  note?: string;
}
export interface InternalNote {
  id: string;
  at: string;
  by: string;
  byName: string;
  text: string;
}

export async function eligibilityFor(user: User, type: ApplicationType): Promise<GateResult> {
  const [ban, prior] = await Promise.all([
    activeBan(user.id),
    db.application.findMany({
      where: { userId: user.id, typeId: type.id },
      select: { id: true, typeId: true, status: true, decidedAt: true },
    }),
  ]);
  return checkEligibility({ ...user, activeBan: ban }, type, prior);
}

export async function submitApplication(user: User, typeSlug: string, rawAnswers: Answers) {
  const type = await db.applicationType.findUnique({ where: { slug: typeSlug } });
  if (!type) throw new ApiError(404, "Application not found");
  const gate = await eligibilityFor(user, type);
  if (!gate.ok) throw new ApiError(403, gate.message, { code: gate.code, until: gate.until });

  const questions = parseQuestions(type.questions);
  const answers = cleanAnswers(questions, rawAnswers);
  const errors = validateAnswers(questions, answers);
  if (Object.keys(errors).length) throw new ApiError(400, "Some answers need attention.", { fieldErrors: errors });

  const history: HistoryEntry[] = [{ at: new Date().toISOString(), by: user.id, byName: user.username, action: "submitted", to: "PENDING" }];
  const app = await db.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        reference: makeReference(),
        typeId: type.id,
        userId: user.id,
        status: "PENDING",
        answers: answers as Prisma.InputJsonValue,
        history: history as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.applicationDraft.deleteMany({ where: { userId: user.id, typeId: type.id } });
    return created;
  });

  await audit(user.id, "application.submit", "Application", app.id, { type: type.slug, reference: app.reference });
  await postWebhook(type.webhookUrl || env.appWebhookUrl, {
    embeds: [
      {
        title: `New application: ${type.title}`,
        url: `${site.url}/admin/applications/${app.id}`,
        color: COLORS.accent,
        fields: [
          { name: "Applicant", value: `<@${user.discordId}> (${user.username})`, inline: true },
          { name: "Type", value: type.title, inline: true },
          { name: "Reference", value: app.reference, inline: true },
        ],
        footer: { text: "Open the link to review" },
        timestamp: new Date().toISOString(),
      },
    ],
  });
  return app;
}

type StaffAction =
  | { kind: "status"; to: ApplicationStatus; reason?: string; interviewAt?: string }
  | { kind: "note"; text: string }
  | { kind: "assign"; toMe: boolean };

/** All staff mutations on an application. Caller must have checked apps.review for the type's department. */
export async function staffUpdate(appId: string, actor: User, action: StaffAction) {
  const app = await db.application.findUnique({ where: { id: appId }, include: { type: true, user: true } });
  if (!app) throw new ApiError(404, "Application not found");
  const now = new Date().toISOString();
  const history = (app.history as unknown as HistoryEntry[]) ?? [];
  const notes = (app.internalNotes as unknown as InternalNote[]) ?? [];

  if (action.kind === "note") {
    notes.push({ id: crypto.randomUUID(), at: now, by: actor.id, byName: actor.username, text: action.text });
    history.push({ at: now, by: actor.id, byName: actor.username, action: "note" });
    await db.application.update({
      where: { id: appId },
      data: { internalNotes: notes as unknown as Prisma.InputJsonValue, history: history as unknown as Prisma.InputJsonValue },
    });
    await audit(actor.id, "application.note", "Application", appId, {});
    return;
  }

  if (action.kind === "assign") {
    history.push({ at: now, by: actor.id, byName: actor.username, action: action.toMe ? "claimed" : "unclaimed" });
    await db.application.update({
      where: { id: appId },
      data: {
        reviewerId: action.toMe ? actor.id : null,
        claimedAt: action.toMe ? new Date() : null,
        history: history as unknown as Prisma.InputJsonValue,
      },
    });
    await audit(actor.id, action.toMe ? "application.claim" : "application.unclaim", "Application", appId, {});
    return;
  }

  const { to } = action;
  if (!canTransition(app.status, to, "staff"))
    throw new ApiError(409, `Can't move an application from ${app.status} to ${to}.`);
  if (to === "INTERVIEW" && !action.interviewAt) throw new ApiError(400, "Pick an interview time.");

  const decided = to === "ACCEPTED" || to === "DENIED";
  history.push({ at: now, by: actor.id, byName: actor.username, action: "status", from: app.status, to, note: action.reason });

  // Side effects that can fail (Discord role grant) run before the status flips,
  // so an application is never marked accepted without its role.
  if (to === "ACCEPTED") await grantOnAccept(app, actor);

  const updated = await db.application.update({
    where: { id: appId },
    data: {
      status: to,
      reviewerId: app.reviewerId ?? actor.id,
      decisionReason: decided ? (action.reason ?? null) : app.decisionReason,
      decidedAt: decided ? new Date() : null,
      interviewAt: to === "INTERVIEW" ? new Date(action.interviewAt!) : app.interviewAt,
      history: history as unknown as Prisma.InputJsonValue,
    },
  });
  await audit(actor.id, `application.${to.toLowerCase()}`, "Application", appId, { reason: action.reason, type: app.type.slug });
  await notifyApplicant(updated, app.type, app.user, actor);
  return updated;
}

async function grantOnAccept(app: Application & { type: ApplicationType; user: User }, actor: User) {
  const reason = `${app.type.title} accepted (${app.reference})`;
  if (app.type.grantsWhitelist) await setWhitelist(app.userId, true, actor.id, reason);
  if (app.type.grantRoleId && app.type.grantRoleId !== env.whitelistRoleId) {
    if (botConfigured()) {
      try {
        await addRole(app.user.discordId, app.type.grantRoleId, reason);
      } catch (e) {
        throw new ApiError(502, `Couldn't add the Discord role, so the application wasn't accepted. ${(e as Error).message}`);
      }
    }
    await db.user.update({
      where: { id: app.userId },
      data: { roleIds: Array.from(new Set([...app.user.roleIds, app.type.grantRoleId])) },
    });
  }
}

async function notifyApplicant(app: Application, type: ApplicationType, user: User, actor: User) {
  const link = `${site.url}/profile/applications/${app.id}`;
  let embed: Embed;
  switch (app.status) {
    case "ACCEPTED":
      embed = {
        title: `Your ${type.title} application was accepted`,
        description: type.grantsWhitelist
          ? `Welcome to ${site.shortName}. You're whitelisted. Head to ${site.url}/queue to connect.`
          : `Congratulations. Your new role has been added in Discord.`,
        color: COLORS.green,
        url: link,
      };
      break;
    case "DENIED": {
      const until = type.cooldownDays ? new Date(Date.now() + type.cooldownDays * 86_400_000) : null;
      embed = {
        title: `Your ${type.title} application was not accepted`,
        description: [
          app.decisionReason ? `**Reason:** ${app.decisionReason}` : null,
          until ? `You can apply again after **${until.toDateString()}**.` : null,
        ]
          .filter(Boolean)
          .join("\n\n") || "Thanks for applying.",
        color: COLORS.red,
        url: link,
      };
      break;
    }
    case "INTERVIEW":
      embed = {
        title: `Interview scheduled: ${type.title}`,
        description: app.interviewAt
          ? `Your interview is set for <t:${Math.floor(app.interviewAt.getTime() / 1000)}:F>. Join the Discord waiting room a few minutes early.`
          : "A staff member will reach out to schedule your interview.",
        color: COLORS.amber,
        url: link,
      };
      break;
    default:
      return;
  }
  if (user.dmNotifications) await sendDM(user.discordId, { embeds: [embed] });
  await postWebhook(env.logWebhookUrl, {
    embeds: [
      {
        title: `Application ${app.status.toLowerCase().replace("_", " ")}: ${type.title}`,
        color: app.status === "ACCEPTED" ? COLORS.green : app.status === "DENIED" ? COLORS.red : COLORS.amber,
        fields: [
          { name: "Applicant", value: `<@${user.discordId}> (${user.username})`, inline: true },
          { name: "Reviewer", value: `<@${actor.discordId}>`, inline: true },
          { name: "Reference", value: app.reference, inline: true },
          ...(app.decisionReason ? [{ name: "Reason", value: app.decisionReason.slice(0, 1000) }] : []),
        ],
        url: `${site.url}/admin/applications/${app.id}`,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function withdraw(appId: string, user: User) {
  const app = await db.application.findUnique({ where: { id: appId } });
  if (!app || app.userId !== user.id) throw new ApiError(404, "Application not found");
  if (!canTransition(app.status, "WITHDRAWN", "applicant")) throw new ApiError(409, "This application can no longer be withdrawn.");
  const history = (app.history as unknown as HistoryEntry[]) ?? [];
  history.push({ at: new Date().toISOString(), by: user.id, byName: user.username, action: "status", from: app.status, to: "WITHDRAWN" });
  await db.application.update({
    where: { id: appId },
    data: { status: "WITHDRAWN", history: history as unknown as Prisma.InputJsonValue },
  });
  await audit(user.id, "application.withdraw", "Application", appId, {});
}
