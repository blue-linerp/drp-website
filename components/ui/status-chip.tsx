import type { ApplicationStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/status-machine";
import { Badge } from "./misc";

const TONE: Record<ApplicationStatus, Parameters<typeof Badge>[0]["tone"]> = {
  DRAFT: "neutral",
  PENDING: "amber",
  UNDER_REVIEW: "blue",
  INTERVIEW: "accent",
  ACCEPTED: "green",
  DENIED: "red",
  WITHDRAWN: "neutral",
};

export function StatusChip({ status }: { status: ApplicationStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
