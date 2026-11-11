import "server-only";
import { z } from "zod";

export const queueRoleSchema = z.object({
  discordRoleId: z.string().regex(/^\d{17,20}$/, "Pick a Discord role"),
  label: z.string().trim().min(1).max(40),
  priority: z.coerce.number().int().min(0).max(10_000),
  reservedSlot: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#E4080A"),
});
