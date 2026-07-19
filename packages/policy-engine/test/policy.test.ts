import { describe, expect, it } from "vitest";
import {
  evaluateRule,
  noticeBeforeHearingRule,
  type PolicyFacts
} from "../src/index.js";

const NOTICE_EVIDENCE = "11111111-1111-4111-8111-111111111111";
const HEARING_EVIDENCE = "22222222-2222-4222-8222-222222222222";

function facts(options: {
  noticeAt?: string;
  hearingAt?: string;
  approved?: boolean;
  ambiguous?: boolean;
} = {}): PolicyFacts {
  const approved = options.approved ?? false;
  const events = [];
  if (options.noticeAt !== undefined || !("noticeAt" in options)) {
    events.push({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      eventType: "notice",
      occurredAt: options.noticeAt ?? "2026-01-05T17:00:00.000Z",
      evidenceItemIds: [NOTICE_EVIDENCE],
      evidenceApproved: approved,
      ambiguous: options.ambiguous ?? false
    });
  }
  if (options.hearingAt !== undefined || !("hearingAt" in options)) {
    events.push({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      eventType: "hearing",
      occurredAt: options.hearingAt ?? "2026-01-20T18:00:00.000Z",
      evidenceItemIds: [HEARING_EVIDENCE],
      evidenceApproved: approved
    });
  }
  return { events };
}

describe("synthetic notice-before-hearing policy", () => {
  it("returns review_required before evidence approval", () => {
    const result = evaluateRule(noticeBeforeHearingRule, facts());
    expect(result.status).toBe("review_required");
    expect(result.ruleVersion).toBe("1.0.0");
    expect(result.limitation).toContain("not a legal conclusion");
  });

  it("is satisfied only when approved notice evidence predates the hearing", () => {
    expect(
      evaluateRule(noticeBeforeHearingRule, facts({ approved: true })).status
    ).toBe("satisfied");
    expect(
      evaluateRule(
        noticeBeforeHearingRule,
        facts({
          approved: true,
          noticeAt: "2026-01-20T18:00:00.000Z",
          hearingAt: "2026-01-20T18:00:00.000Z"
        })
      ).status
    ).toBe("apparently_unsatisfied");
  });

  it("is indeterminate when evidence is missing or ambiguous", () => {
    expect(
      evaluateRule(noticeBeforeHearingRule, { events: facts({ approved: true }).events.slice(0, 1) })
        .status
    ).toBe("indeterminate");
    expect(
      evaluateRule(noticeBeforeHearingRule, facts({ approved: true, ambiguous: true })).status
    ).toBe("indeterminate");
  });
});
