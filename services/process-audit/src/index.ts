import { randomUUID } from "node:crypto";

export type FindingStatus =
  | "satisfied"
  | "apparently_unsatisfied"
  | "indeterminate"
  | "not_applicable"
  | "review_required";

export interface FindingEvaluation {
  ruleId: string;
  ruleVersion: string;
  status: FindingStatus;
  explanation: string;
  evidenceItemIds: readonly string[];
  inputFacts: Readonly<Record<string, unknown>>;
  limitation: string;
  consequential: boolean;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleVersion: string;
  status: FindingStatus;
  explanation: string;
  evidenceItemIds: readonly string[];
  inputFacts: Readonly<Record<string, unknown>>;
  limitation: string;
  consequential: boolean;
}

export type ReviewDisposition =
  | "approved"
  | "rejected"
  | "corrected"
  | "deferred"
  | "superseded";

export interface ReviewActor {
  userId: string;
  organizationId: string;
  roles: readonly ("professional" | "reviewer" | "administrator")[];
  correlationId: string;
}

export interface ReviewDecision {
  id: string;
  findingId: string;
  actorId: string;
  organizationId: string;
  disposition: ReviewDisposition;
  rationale: string;
  occurredAt: string;
  correlationId: string;
  supersedesDecisionId?: string;
}

export function createFinding(
  evaluation: FindingEvaluation,
  id = randomUUID()
): Finding {
  if (evaluation.evidenceItemIds.length === 0) {
    throw new Error("A process finding requires source-backed evidence");
  }
  return Object.freeze({
    id,
    ruleId: evaluation.ruleId,
    ruleVersion: evaluation.ruleVersion,
    status: evaluation.status,
    explanation: evaluation.explanation,
    evidenceItemIds: Object.freeze([...evaluation.evidenceItemIds]),
    inputFacts: Object.freeze({ ...evaluation.inputFacts }),
    limitation: evaluation.limitation,
    consequential: evaluation.consequential
  });
}

export function recordReviewDecision(input: {
  findingId: string;
  actor: ReviewActor;
  disposition: ReviewDisposition;
  rationale: string;
  occurredAt: string;
  supersedesDecisionId?: string;
  id?: string;
}): ReviewDecision {
  if (!input.actor.roles.includes("reviewer")) {
    throw new Error("Required role: reviewer");
  }
  if (input.rationale.trim().length === 0) {
    throw new Error("Review rationale is required");
  }
  if (input.disposition === "superseded" && !input.supersedesDecisionId) {
    throw new Error("A superseding decision must reference the prior decision ID");
  }

  const decision: ReviewDecision = {
    id: input.id ?? randomUUID(),
    findingId: input.findingId,
    actorId: input.actor.userId,
    organizationId: input.actor.organizationId,
    disposition: input.disposition,
    rationale: input.rationale.trim(),
    occurredAt: input.occurredAt,
    correlationId: input.actor.correlationId,
    ...(input.supersedesDecisionId
      ? { supersedesDecisionId: input.supersedesDecisionId }
      : {})
  };
  return Object.freeze(decision);
}

function compareDecisions(left: ReviewDecision, right: ReviewDecision): number {
  if (left.occurredAt < right.occurredAt) return -1;
  if (left.occurredAt > right.occurredAt) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function canReleaseFinding(
  finding: Finding,
  decisions: readonly ReviewDecision[]
): boolean {
  if (!finding.consequential) return true;
  const relevant = decisions
    .filter((decision) => decision.findingId === finding.id)
    .sort(compareDecisions);
  return relevant.at(-1)?.disposition === "approved";
}
