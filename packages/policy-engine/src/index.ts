export type PolicyStatus =
  | "satisfied"
  | "apparently_unsatisfied"
  | "indeterminate"
  | "not_applicable"
  | "review_required";

export interface PolicyEventFact {
  id: string;
  eventType: string;
  occurredAt: string;
  evidenceItemIds: readonly string[];
  evidenceApproved: boolean;
  ambiguous?: boolean;
}

export interface PolicyFacts {
  events: readonly PolicyEventFact[];
}

export interface PolicyEvaluation {
  ruleId: string;
  ruleVersion: string;
  status: PolicyStatus;
  explanation: string;
  evidenceItemIds: readonly string[];
  inputFacts: Readonly<Record<string, unknown>>;
  limitation: string;
  consequential: boolean;
}

export interface PolicyRule {
  id: string;
  version: string;
  description: string;
  limitation: string;
  consequential: boolean;
  evaluate(facts: PolicyFacts): Omit<PolicyEvaluation, "ruleId" | "ruleVersion" | "limitation" | "consequential">;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function freezeEvaluation(evaluation: PolicyEvaluation): PolicyEvaluation {
  return Object.freeze({
    ...evaluation,
    evidenceItemIds: Object.freeze([...evaluation.evidenceItemIds]),
    inputFacts: Object.freeze({ ...evaluation.inputFacts })
  });
}

export function evaluateRule(rule: PolicyRule, facts: PolicyFacts): PolicyEvaluation {
  const result = rule.evaluate(facts);
  return freezeEvaluation({
    ...result,
    ruleId: rule.id,
    ruleVersion: rule.version,
    limitation: rule.limitation,
    consequential: rule.consequential
  });
}

const LIMITATION =
  "This synthetic rule evaluates only the observed ordering and review state of source-backed fixture events. It is not a legal conclusion and does not determine whether notice was legally sufficient.";

const noticeBeforeHearingRuleDefinition: PolicyRule = {
  id: "synthetic.notice-before-hearing.v1",
  version: "1.0.0",
  description: "Checks whether an approved synthetic notice event predates an approved synthetic hearing event.",
  limitation: LIMITATION,
  consequential: true,
  evaluate(facts: PolicyFacts) {
    const notices = facts.events
      .filter((event) => event.eventType === "notice")
      .sort((left, right) => compareStrings(left.occurredAt, right.occurredAt));
    const hearings = facts.events
      .filter((event) => event.eventType === "hearing")
      .sort((left, right) => compareStrings(left.occurredAt, right.occurredAt));
    const notice = notices[0];
    const hearing = hearings[0];
    const evidenceItemIds = Object.freeze(
      [...new Set([...(notice?.evidenceItemIds ?? []), ...(hearing?.evidenceItemIds ?? [])])].sort(
        compareStrings
      )
    );
    const inputFacts = {
      noticeEventId: notice?.id ?? null,
      noticeOccurredAt: notice?.occurredAt ?? null,
      hearingEventId: hearing?.id ?? null,
      hearingOccurredAt: hearing?.occurredAt ?? null
    };

    if (!notice || !hearing) {
      return {
        status: "indeterminate",
        explanation: "The rule cannot be evaluated because a notice or hearing event is missing from the acquired evidence.",
        evidenceItemIds,
        inputFacts
      };
    }

    if (notice.ambiguous === true || hearing.ambiguous === true) {
      return {
        status: "indeterminate",
        explanation: "The rule cannot be evaluated because the notice or hearing match is ambiguous and requires human resolution.",
        evidenceItemIds,
        inputFacts
      };
    }

    if (!notice.evidenceApproved || !hearing.evidenceApproved) {
      return {
        status: "review_required",
        explanation: "Notice and hearing evidence exists, but the relevant evidence has not completed human review.",
        evidenceItemIds,
        inputFacts
      };
    }

    if (compareStrings(notice.occurredAt, hearing.occurredAt) < 0) {
      return {
        status: "satisfied",
        explanation: "The approved synthetic notice event predates the approved synthetic hearing event.",
        evidenceItemIds,
        inputFacts
      };
    }

    return {
      status: "apparently_unsatisfied",
      explanation: "The approved synthetic notice event does not predate the approved synthetic hearing event. Human review and the stated limitations still apply.",
      evidenceItemIds,
      inputFacts
    };
  }
};

export const noticeBeforeHearingRule: PolicyRule = Object.freeze(
  noticeBeforeHearingRuleDefinition
);
