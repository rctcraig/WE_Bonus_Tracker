import type { Role } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  manager: "Office Manager",
  doctor: "Doctor",
  leadership: "Leadership",
  staff: "Staff",
};

export function canInvite(role: Role) {
  return role === "admin" || role === "manager";
}

export function canEditProduction(role: Role) {
  return role === "admin" || role === "manager";
}

export function canViewInsights(role: Role) {
  return role === "admin" || role === "manager" || role === "doctor";
}

export function assignableRolesFor(role: Role): Role[] {
  if (role === "admin") {
    return ["manager", "doctor", "leadership", "staff"];
  }

  if (role === "manager") {
    return ["doctor", "leadership", "staff"];
  }

  return [];
}
