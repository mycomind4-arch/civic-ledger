import { describe, expect, it } from "vitest";
import {
  requireOrganization,
  requireRole,
  type ActorContext,
  type Role
} from "../src/index.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function actor(roles: readonly Role[]): ActorContext {
  return {
    userId: USER_A,
    organizationId: ORG_A,
    roles,
    correlationId: "44444444-4444-4444-8444-444444444444"
  };
}

describe("actor authorization", () => {
  it("requires reviewer role for consequential review", () => {
    expect(() => requireRole(actor(["professional"]), "reviewer")).toThrow("reviewer");
    expect(requireRole(actor(["reviewer"]), "reviewer").userId).toBe(USER_A);
  });

  it("requires exact organization membership", () => {
    expect(requireOrganization(actor(["professional"]), ORG_A).organizationId).toBe(ORG_A);
    expect(() => requireOrganization(actor(["professional"]), ORG_B)).toThrow(
      "Organization mismatch"
    );
  });
});
