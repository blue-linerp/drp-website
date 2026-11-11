import type { ApplicationStatus } from "@prisma/client";

export type Actor = "applicant" | "staff" | "system";

const STAFF_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: [],
  PENDING: ["UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "DENIED"],
  UNDER_REVIEW: ["PENDING", "INTERVIEW", "ACCEPTED", "DENIED"],
  INTERVIEW: ["UNDER_REVIEW", "ACCEPTED", "DENIED"],
  ACCEPTED: [],
  DENIED: [],
  WITHDRAWN: [],
};

const APPLICANT_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["PENDING", "WITHDRAWN"],
  PENDING: ["WITHDRAWN"],
  UNDER_REVIEW: ["WITHDRAWN"],
  INTERVIEW: ["WITHDRAWN"],
  ACCEPTED: [],
  DENIED: [],
  WITHDRAWN: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: Actor): boolean {
  if (actor === "system") return STAFF_TRANSITIONS[from].includes(to) || APPLICANT_TRANSITIONS[from].includes(to);
  const table = actor === "staff" ? STAFF_TRANSITIONS : APPLICANT_TRANSITIONS;
  return table[from].includes(to);
}

export function isOpenStatus(s: ApplicationStatus) {
  return s === "PENDING" || s === "UNDER_REVIEW" || s === "INTERVIEW";
}

export function isFinal(s: ApplicationStatus) {
  return s === "ACCEPTED" || s === "DENIED" || s === "WITHDRAWN";
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  ACCEPTED: "Accepted",
  DENIED: "Denied",
  WITHDRAWN: "Withdrawn",
};
