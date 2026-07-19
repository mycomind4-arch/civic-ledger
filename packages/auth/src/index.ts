export type Role = "professional" | "reviewer" | "administrator";

export interface ActorContext {
  userId: string;
  organizationId: string;
  roles: readonly Role[];
  correlationId: string;
}

export function requireRole(actor: ActorContext, role: Role): ActorContext {
  if (!actor.roles.includes(role)) {
    throw new Error(`Required role: ${role}`);
  }
  return actor;
}

export function requireOrganization(
  actor: ActorContext,
  organizationId: string
): ActorContext {
  if (actor.organizationId !== organizationId) {
    throw new Error("Organization mismatch");
  }
  return actor;
}
