import { describe, expect, it } from "vitest";
import {
  canReleaseFinding,
  createFinding,
  recordReviewDecision,
  type FindingEvaluation,
  type ReviewActor
} from "../src/index.js";

const FINDING_ID = "55555555-5555-4555-8555-555555555555";
const NOW = "2026-07-19T20:00:00.000Z";
const reviewerActor: ReviewActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  roles: ["reviewer"],
  correlationId: "44444444-4444-4444-8444-444444444444"
};

function reviewRequiredEvaluation(): FindingEvaluation {
  return {
    ruleId: "synthetic.notice-before-hearing.v1",
    ruleVersion: "1.0.0",
    status: "review_required",
    explanation: "Evidence requires human review.",
    evidenceItemIds: ["22222222-2222-4222-8222-222222222222"],
    inputFacts: { noticeOccurredAt: "2026-01-05T17:00:00.000Z" },
    limitation: "This is not a legal conclusion.",
    consequential: true
  };
}

describe("process finding review", () => {
  it("does not release a consequential finding without reviewer approval", () => {
    const finding = createFinding(reviewRequiredEvaluation(), FINDING_ID);
    expect(canReleaseFinding(finding, [])).toBe(false);
    const decision = recordReviewDecision({
      findingId: finding.id,
      actor: reviewerActor,
      disposition: "approved",
      rationale: "Synthetic evidence order verified",
      occurredAt: NOW,
      id: "66666666-6666-4666-8666-666666666666"
    });
    expect(canReleaseFinding(finding, [decision])).toBe(true);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it("requires the reviewer role", () => {
    expect(() =>
      recordReviewDecision({
        findingId: FINDING_ID,
        actor: { ...reviewerActor, roles: ["professional"] },
        disposition: "approved",
        rationale: "Attempted review",
        occurredAt: NOW
      })
    ).toThrow("reviewer");
  });

  it("requires a prior decision reference when superseding", () => {
    expect(() =>
      recordReviewDecision({
        findingId: FINDING_ID,
        actor: reviewerActor,
        disposition: "superseded",
        rationale: "Prior review replaced",
        occurredAt: NOW
      })
    ).toThrow("prior decision ID");
  });

  it("uses the latest append-only decision as the release state", () => {
    const finding = createFinding(reviewRequiredEvaluation(), FINDING_ID);
    const approved = recordReviewDecision({
      findingId: finding.id,
      actor: reviewerActor,
      disposition: "approved",
      rationale: "Initial approval",
      occurredAt: "2026-07-19T20:00:00.000Z",
      id: "66666666-6666-4666-8666-666666666666"
    });
    const deferred = recordReviewDecision({
      findingId: finding.id,
      actor: reviewerActor,
      disposition: "deferred",
      rationale: "Additional evidence requested",
      occurredAt: "2026-07-19T21:00:00.000Z",
      id: "77777777-7777-4777-8777-777777777777",
      supersedesDecisionId: approved.id
    });
    expect(canReleaseFinding(finding, [approved, deferred])).toBe(false);
  });
});
