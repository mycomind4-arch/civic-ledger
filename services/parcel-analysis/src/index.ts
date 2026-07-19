export type CompletenessStatus =
  | "present"
  | "missing_expected_evidence"
  | "unavailable_source"
  | "ambiguous_match"
  | "stale_observation"
  | "review_required";

export interface TimelineEntry {
  id: string;
  eventType: string;
  occurredAt: string;
  summary: string;
  evidenceItemIds: readonly string[];
}

export interface AnalysisEvidenceItem {
  id: string;
  category: string;
}

export interface CompletenessCategory {
  category: string;
  status: CompletenessStatus;
  evidenceItemIds: readonly string[];
  explanation: string;
}

export interface ParcelAnalysisInput {
  events: readonly TimelineEntry[];
  evidenceItems: readonly AnalysisEvidenceItem[];
  expectedCategories: readonly string[];
  unavailableCategories?: readonly string[];
  ambiguousEvidenceItemIds?: readonly string[];
  staleEvidenceItemIds?: readonly string[];
  reviewRequiredEvidenceItemIds?: readonly string[];
}

export interface ParcelAnalysis {
  timeline: readonly TimelineEntry[];
  completeness: readonly CompletenessCategory[];
}

const MISSING_EXPLANATION =
  "The fixture expects this category, but no matching evidence was acquired. This does not prove the record does not exist.";

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function completenessFor(
  category: string,
  evidenceItemIds: readonly string[],
  input: ParcelAnalysisInput
): CompletenessCategory {
  const unavailable = new Set(input.unavailableCategories ?? []);
  const ambiguous = new Set(input.ambiguousEvidenceItemIds ?? []);
  const stale = new Set(input.staleEvidenceItemIds ?? []);
  const reviewRequired = new Set(input.reviewRequiredEvidenceItemIds ?? []);

  if (unavailable.has(category)) {
    return {
      category,
      status: "unavailable_source",
      evidenceItemIds,
      explanation: "The approved source was unavailable during acquisition. No absence conclusion is drawn."
    };
  }
  if (evidenceItemIds.length === 0) {
    return {
      category,
      status: "missing_expected_evidence",
      evidenceItemIds,
      explanation: MISSING_EXPLANATION
    };
  }
  if (evidenceItemIds.some((id) => ambiguous.has(id))) {
    return {
      category,
      status: "ambiguous_match",
      evidenceItemIds,
      explanation: "One or more records may match this parcel, but human resolution is required."
    };
  }
  if (evidenceItemIds.some((id) => stale.has(id))) {
    return {
      category,
      status: "stale_observation",
      evidenceItemIds,
      explanation: "Matching evidence exists, but its observation is outside the accepted freshness window."
    };
  }
  if (evidenceItemIds.some((id) => reviewRequired.has(id))) {
    return {
      category,
      status: "review_required",
      evidenceItemIds,
      explanation: "Matching evidence exists but has not completed the required human review."
    };
  }

  return {
    category,
    status: "present",
    evidenceItemIds,
    explanation: "Matching source-backed evidence is present."
  };
}

export function analyzeParcelCase(input: ParcelAnalysisInput): ParcelAnalysis {
  for (const event of input.events) {
    if (event.evidenceItemIds.length === 0) {
      throw new Error(`Timeline event ${event.id} has no evidence references`);
    }
  }

  const timeline = Object.freeze(
    [...input.events].sort((left, right) => {
      const time = compareStrings(left.occurredAt, right.occurredAt);
      if (time !== 0) return time;
      const type = compareStrings(left.eventType, right.eventType);
      if (type !== 0) return type;
      return compareStrings(left.id, right.id);
    })
  );

  const categories = [...new Set(input.expectedCategories)].sort(compareStrings);
  const completeness = Object.freeze(
    categories.map((category) => {
      const evidenceItemIds = input.evidenceItems
        .filter((item) => item.category === category)
        .map((item) => item.id)
        .sort(compareStrings);
      return completenessFor(category, Object.freeze(evidenceItemIds), input);
    })
  );

  return Object.freeze({ timeline, completeness });
}
