import { describe, expect, it } from "vitest";
import { analyzeParcelCase, type ParcelAnalysisInput } from "../src/index.js";

const NOTICE_EVIDENCE = "11111111-1111-4111-8111-111111111111";
const HEARING_EVIDENCE = "22222222-2222-4222-8222-222222222222";
const ACTION_EVIDENCE = "33333333-3333-4333-8333-333333333333";

function fixtureAnalysisInput(): ParcelAnalysisInput {
  return {
    events: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        eventType: "enforcement_action",
        occurredAt: "2026-02-02T19:00:00.000Z",
        summary: "Synthetic enforcement action",
        evidenceItemIds: [ACTION_EVIDENCE]
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        eventType: "notice",
        occurredAt: "2026-01-05T17:00:00.000Z",
        summary: "Synthetic notice",
        evidenceItemIds: [NOTICE_EVIDENCE]
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        eventType: "hearing",
        occurredAt: "2026-01-20T18:00:00.000Z",
        summary: "Synthetic hearing",
        evidenceItemIds: [HEARING_EVIDENCE]
      }
    ],
    evidenceItems: [
      { id: NOTICE_EVIDENCE, category: "notice" },
      { id: HEARING_EVIDENCE, category: "hearing" },
      { id: ACTION_EVIDENCE, category: "enforcement_action" }
    ],
    expectedCategories: [
      "notice",
      "hearing",
      "enforcement_action",
      "recorded_instrument"
    ]
  };
}

describe("parcel analysis", () => {
  it("orders events and separates missing from unavailable evidence", () => {
    const analysis = analyzeParcelCase(fixtureAnalysisInput());
    expect(analysis.timeline.map((entry) => entry.eventType)).toEqual([
      "notice",
      "hearing",
      "enforcement_action"
    ]);
    expect(analysis.timeline.every((entry) => entry.evidenceItemIds.length > 0)).toBe(true);
    expect(analysis.completeness).toContainEqual({
      category: "recorded_instrument",
      status: "missing_expected_evidence",
      evidenceItemIds: [],
      explanation:
        "The fixture expects this category, but no matching evidence was acquired. This does not prove the record does not exist."
    });
  });

  it("reports an unavailable source separately from missing evidence", () => {
    const analysis = analyzeParcelCase({
      ...fixtureAnalysisInput(),
      expectedCategories: ["recorded_instrument"],
      unavailableCategories: ["recorded_instrument"]
    });
    expect(analysis.completeness[0]).toMatchObject({
      category: "recorded_instrument",
      status: "unavailable_source"
    });
  });

  it("uses explicit precedence for ambiguity, staleness, and review", () => {
    const input = fixtureAnalysisInput();
    const ambiguous = analyzeParcelCase({
      ...input,
      expectedCategories: ["notice"],
      ambiguousEvidenceItemIds: [NOTICE_EVIDENCE],
      staleEvidenceItemIds: [NOTICE_EVIDENCE],
      reviewRequiredEvidenceItemIds: [NOTICE_EVIDENCE]
    });
    expect(ambiguous.completeness[0]?.status).toBe("ambiguous_match");

    const stale = analyzeParcelCase({
      ...input,
      expectedCategories: ["notice"],
      staleEvidenceItemIds: [NOTICE_EVIDENCE],
      reviewRequiredEvidenceItemIds: [NOTICE_EVIDENCE]
    });
    expect(stale.completeness[0]?.status).toBe("stale_observation");

    const review = analyzeParcelCase({
      ...input,
      expectedCategories: ["notice"],
      reviewRequiredEvidenceItemIds: [NOTICE_EVIDENCE]
    });
    expect(review.completeness[0]?.status).toBe("review_required");
  });

  it("rejects timeline events without evidence", () => {
    const input = fixtureAnalysisInput();
    expect(() =>
      analyzeParcelCase({
        ...input,
        events: [{ ...input.events[0]!, evidenceItemIds: [] }]
      })
    ).toThrow("no evidence references");
  });
});
