/**
 * Staff permissions are derived from Discord roles on every request (never from client flags).
 * Pure functions here so they can be unit-tested; lib/session.ts wires them to the DB/session.
 */
export type StaffLevel = "ADMIN" | "SENIOR_STAFF" | "STAFF" | "DEPT_HEAD";

export interface RoleConfig {
  adminRoleIds: string[];
  seniorStaffRoleIds: string[];
  staffRoleIds: string[];
  deptHeadRoles: Record<string, string[]>;
}

export interface Access {
  level: StaffLevel | null;
  departments: string[];
}

export type Action =
  | "admin.view"
  | "apps.review"
  | "users.view"
  | "bans.manage"
  | "content.manage"
  | "whitelist.manage"
  | "queue.manage"
  | "types.manage"
  | "settings.manage"
  | "audit.view";

const MATRIX: Record<StaffLevel, Action[]> = {
  ADMIN: ["admin.view", "apps.review", "users.view", "bans.manage", "content.manage", "whitelist.manage", "queue.manage", "types.manage", "settings.manage", "audit.view"],
  SENIOR_STAFF: ["admin.view", "apps.review", "users.view", "bans.manage", "content.manage", "whitelist.manage", "queue.manage", "audit.view"],
  STAFF: ["admin.view", "apps.review", "users.view"],
  DEPT_HEAD: ["admin.view", "apps.review"],
};

export function resolveAccess(roleIds: string[], cfg: RoleConfig): Access {
  const has = (ids: string[]) => ids.some((id) => roleIds.includes(id));
  const departments = Object.entries(cfg.deptHeadRoles)
    .filter(([, ids]) => has(ids))
    .map(([dept]) => dept);
  if (has(cfg.adminRoleIds)) return { level: "ADMIN", departments };
  if (has(cfg.seniorStaffRoleIds)) return { level: "SENIOR_STAFF", departments };
  if (has(cfg.staffRoleIds)) return { level: "STAFF", departments };
  if (departments.length) return { level: "DEPT_HEAD", departments };
  return { level: null, departments: [] };
}

/**
 * @param ctx.department the application type's department, for DEPT_HEAD scoping.
 */
export function can(access: Access, action: Action, ctx?: { department?: string | null }): boolean {
  if (!access.level) return false;
  if (!MATRIX[access.level].includes(action)) return false;
  if (access.level === "DEPT_HEAD" && action === "apps.review" && ctx) {
    return !!ctx.department && access.departments.includes(ctx.department.toLowerCase());
  }
  return true;
}

export function isStaff(access: Access) {
  return access.level !== null;
}

export const LEVEL_LABEL: Record<StaffLevel, string> = {
  ADMIN: "Admin",
  SENIOR_STAFF: "Senior Staff",
  STAFF: "Staff",
  DEPT_HEAD: "Department Head",
};
