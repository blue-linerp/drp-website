import "server-only";
import { z } from "zod";
import { questionsSchema } from "./questions";
import { APP_ICONS } from "@/components/apps/icon";

const nullable = (s: z.ZodString) => s.optional().nullable().transform((v) => (v ? v : null));

export const typeSchema = z.object({
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes"),
  title: z.string().trim().min(1).max(80),
  category: z.enum(["WHITELIST", "DEPARTMENT", "STAFF", "SPECIAL"]),
  department: nullable(z.string().trim().toLowerCase().max(40)),
  description: z.string().trim().max(400),
  icon: z.string().refine((v) => v in APP_ICONS, "Unknown icon"),
  isOpen: z.boolean(),
  opensAt: z.string().datetime({ offset: true }).optional().nullable(),
  closesAt: z.string().datetime({ offset: true }).optional().nullable(),
  minAge: z.number().int().min(0).max(99).optional().nullable(),
  minDiscordAgeDays: z.number().int().min(0).max(3650),
  requiredRoleIds: z.array(z.string().regex(/^\d{17,20}$/, "Role IDs are 17–20 digit numbers")).max(10),
  requiresWhitelist: z.boolean(),
  grantRoleId: nullable(z.string().regex(/^\d{17,20}$/)),
  grantsWhitelist: z.boolean(),
  cooldownDays: z.number().int().min(0).max(365),
  webhookUrl: nullable(z.string().url().startsWith("https://")),
  questions: questionsSchema,
});

export function toData(b: z.infer<typeof typeSchema>) {
  return { ...b, opensAt: b.opensAt ? new Date(b.opensAt) : null, closesAt: b.closesAt ? new Date(b.closesAt) : null, minAge: b.minAge ?? null };
}
