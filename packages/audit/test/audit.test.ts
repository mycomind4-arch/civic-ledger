import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditChain,
  type AuditEventInput
} from "../src/index.js";

function event(action: string): AuditEventInput {
  return {
    organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "11111111-1111-4111-8111-111111111111",
    action,
    targetType: "case",
    targetId: "33333333-3333-4333-8333-333333333333",
    occurredAt: "2026-07-19T20:00:00.000Z",
    correlationId: "44444444-4444-4444-8444-444444444444",
    payload: { title: "Synthetic parcel case", status: "open" }
  };
}

describe("audit chain", () => {
  it("builds and verifies a deterministic hash chain", () => {
    const first = appendAuditEvent([], event("case.created"), "55555555-5555-4555-8555-555555555555");
    const chain = appendAuditEvent(
      first,
      event("case.reviewed"),
      "66666666-6666-4666-8666-666666666666"
    );

    expect(first[0]?.previousHash).toBe("0".repeat(64));
    expect(chain[1]?.previousHash).toBe(chain[0]?.eventHash);
    expect(verifyAuditChain(chain)).toEqual({ valid: true });
  });

  it("detects altered audit history", () => {
    const chain = appendAuditEvent([], event("case.created"));
    const altered = [{ ...chain[0]!, action: "case.deleted" }];
    expect(verifyAuditChain(altered)).toEqual({ valid: false, invalidIndex: 0 });
  });

  it("detects a broken previous hash", () => {
    const first = appendAuditEvent([], event("case.created"));
    const second = appendAuditEvent(first, event("case.reviewed"));
    const altered = [second[0]!, { ...second[1]!, previousHash: "f".repeat(64) }];
    expect(verifyAuditChain(altered)).toEqual({ valid: false, invalidIndex: 1 });
  });
});
