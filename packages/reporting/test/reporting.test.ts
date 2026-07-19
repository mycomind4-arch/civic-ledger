import { describe, expect, it } from "vitest";
import {
  buildReportDraft,
  releaseReport,
  supersedeReport,
  type ReportInput,
  type ReportReviewer
} from "../src/index.js";

const NOW = "2026-07-19T20:00:00.000Z";
const EVIDENCE_A = "11111111-1111-4111-8111-111111111111";
const EVIDENCE_B = "22222222-2222-4222-8222-222222222222";
const reviewer: ReportReviewer = {
  userId: "33333333-3333-4333-8333-333333333333",
  organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  roles: ["reviewer"],
  correlationId: "44444444-4444-4444-8444-444444444444"
};

function reportInput(options: {
  timelineEvidenceItemIds?: readonly string[];
  signedUrl?: string;
  caseTitle?: string;
} = {}): ReportInput {
  return {
    idempotencyKey: "parcel-case-001-report-v1",
    caseId: "55555555-5555-4555-8555-555555555555",
    caseTitle: options.caseTitle ?? "Synthetic parcel report",
    parcel: {
      parcelId: "66666666-6666-4666-8666-666666666666",
      jurisdiction: "Synthetic County",
      apnNormalized: "123456007000",
      addressNormalized: "100 MAIN ST EXAMPLEVILLE CA",
      evidenceItemIds: [EVIDENCE_B, EVIDENCE_A]
    },
    sourceInventory: [
      {
        sourceId: "77777777-7777-4777-8777-777777777777",
        name: "Synthetic fixture source",
        observedAt: NOW,
        state: "available",
        evidenceItemIds: [EVIDENCE_A],
        ...(options.signedUrl ? { signedUrl: options.signedUrl } : {})
      }
    ],
    timeline: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        eventType: "notice",
        occurredAt: "2026-01-05T17:00:00.000Z",
        summary: "Synthetic notice",
        evidenceItemIds: options.timelineEvidenceItemIds ?? [EVIDENCE_A]
      }
    ],
    completeness: [
      {
        category: "notice",
        status: "present",
        explanation: "Matching source-backed evidence is present.",
        evidenceItemIds: [EVIDENCE_A]
      },
      {
        category: "recorded_instrument",
        status: "missing_expected_evidence",
        explanation:
          "No matching evidence was acquired. This does not prove the record does not exist.",
        evidenceItemIds: []
      }
    ],
    findings: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        ruleId: "synthetic.notice-before-hearing.v1",
        ruleVersion: "1.0.0",
        status: "satisfied",
        explanation: "The approved synthetic notice predates the hearing.",
        limitation: "This is not a legal conclusion.",
        evidenceItemIds: [EVIDENCE_A, EVIDENCE_B],
        consequential: true,
        releaseApproved: true
      }
    ],
    unresolvedQuestions: ["Was a recorded instrument available from another source?"],
    evidenceManifest: {
      schemaVersion: "civic-ledger.evidence-manifest.v1",
      manifestSha256: "a".repeat(64),
      items: [{ id: EVIDENCE_A }, { id: EVIDENCE_B }]
    }
  };
}

describe("evidence reports", () => {
  it("rejects factual timeline entries without evidence", () => {
    expect(() => buildReportDraft(reportInput({ timelineEvidenceItemIds: [] }))).toThrow(
      "evidence"
    );
  });

  it("creates an immutable released version", () => {
    const released = releaseReport(
      buildReportDraft(reportInput()),
      reviewer,
      NOW,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    expect(released.version).toBe(1);
    expect(released.status).toBe("released");
    expect(released.reportSha256).toHaveLength(64);
    expect(Object.isFrozen(released)).toBe(true);
    expect(Object.isFrozen(released.timeline)).toBe(true);
    expect(released.parcel.evidenceItemIds).toEqual([EVIDENCE_A, EVIDENCE_B]);
  });

  it("excludes transient signed URLs from the report hash", () => {
    const first = releaseReport(
      buildReportDraft(reportInput({ signedUrl: "https://example.invalid/one?signature=one" })),
      reviewer,
      NOW,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    const second = releaseReport(
      buildReportDraft(reportInput({ signedUrl: "https://example.invalid/two?signature=two" })),
      reviewer,
      NOW,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    expect(second.reportSha256).toBe(first.reportSha256);
  });

  it("creates a superseding version without changing the prior report", () => {
    const first = releaseReport(
      buildReportDraft(reportInput()),
      reviewer,
      NOW,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    );
    const second = supersedeReport(
      first,
      buildReportDraft(reportInput({ caseTitle: "Corrected synthetic parcel report" })),
      reviewer,
      "2026-07-19T21:00:00.000Z",
      "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"
    );
    expect(second.version).toBe(2);
    expect(second.supersedesReportId).toBe(first.id);
    expect(first.version).toBe(1);
    expect(first.caseTitle).toBe("Synthetic parcel report");
  });

  it("rejects consequential findings without approval", () => {
    const input = reportInput();
    expect(() =>
      buildReportDraft({
        ...input,
        findings: [{ ...input.findings[0]!, releaseApproved: false }]
      })
    ).toThrow("reviewer approval");
  });
});
