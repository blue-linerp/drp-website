import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tebex webhook signature: HMAC-SHA256( sha256_hex(rawBody), secret ) as hex, in X-Signature.
 * https://docs.tebex.io/developers/webhooks/overview
 */
export function verifyTebexSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const expected = createHmac("sha256", secret).update(bodyHash).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature.trim().toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface TebexWebhook {
  id: string;
  type: string;
  date: string;
  subject: {
    transaction_id?: string;
    status?: { id: number; description: string };
    customer?: { email?: string; username?: { id?: string | number; username?: string } };
    products?: { id: number | string; name: string }[];
    /** recurring-payment.* events */
    initial_payment?: { transaction_id?: string; customer?: TebexWebhook["subject"]["customer"]; products?: { id: number | string; name: string }[] };
    last_payment?: { transaction_id?: string; customer?: TebexWebhook["subject"]["customer"]; products?: { id: number | string; name: string }[] };
    next_payment_at?: string | null;
    status_reason?: string;
  };
}

export type TebexOutcome =
  | { kind: "grant"; packageIds: string[]; until: Date | null }
  | { kind: "revoke"; packageIds: string[] }
  | { kind: "ignore" };

const MONTH_MS = 31 * 86_400_000;

/** Map a Tebex event to what should happen to the supporter tier. Pure for testability. */
export function interpretTebex(evt: TebexWebhook, now = new Date()): TebexOutcome {
  const s = evt.subject;
  const products = s.products ?? s.last_payment?.products ?? s.initial_payment?.products ?? [];
  const packageIds = products.map((p) => String(p.id));
  switch (evt.type) {
    case "payment.completed":
      return { kind: "grant", packageIds, until: new Date(now.getTime() + MONTH_MS) };
    case "recurring-payment.started":
    case "recurring-payment.renewed":
      return {
        kind: "grant",
        packageIds,
        until: s.next_payment_at ? new Date(new Date(s.next_payment_at).getTime() + 3 * 86_400_000) : new Date(now.getTime() + MONTH_MS),
      };
    case "recurring-payment.ended":
    case "payment.refunded":
    case "payment.dispute.opened":
    case "payment.declined":
      return { kind: "revoke", packageIds };
    default:
      return { kind: "ignore" };
  }
}

export function tebexCustomer(evt: TebexWebhook) {
  const c = evt.subject.customer ?? evt.subject.last_payment?.customer ?? evt.subject.initial_payment?.customer;
  return { id: c?.username?.id != null ? String(c.username.id) : null, username: c?.username?.username ?? null, email: c?.email ?? null };
}
