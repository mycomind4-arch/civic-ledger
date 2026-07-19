import { createHash, randomUUID } from "node:crypto";

export const REPORT_SCHEMA_VERSION = "civic-ledger.report.v1" as const;

export interface ReportReviewer {
  userId: string;
  organizationId: string;
  roles: readonly ("professional" | "reviewer" | "administrator")[];
  correlationId: string;
}

export interface ReportParcelSummary {
  parcelId: string;
  jurisdiction: string;
  apnNormalized: string;
  addressNormalized: string;
  evidenceItemIds: readonly string[];
}

export interface ReportSourceEntry {
  sourceId: string;
  name: string;
  observedAt: string;
  state: "available" | "unavailable" | "stale";
  evidenceItemIds: readonly string[];
  signedUrl?: string;
}

export interface ReportTimelineEntry {
  id: string;
  eventType: string;
  occurredAt: string;
  summary: string;
  evidenceItemIds: readonly string[];
}

export interface ReportCompletenessEntry {
  category: string;
  status:
    | "present"
    | "missing_expected_evidence"
    | "unavailable_source"
    | "ambiguous_match"
    | "stale_observation"
    | "review_required";
  explanation: string;
  evidenceItemIds: readonly string[];
}

export interface ReportFindingEntry {
  id: string;
  ruleId: string;
  ruleVersion: string;
  status: string;
  explanation: string;
  limitation: string;
  evidenceItemIds: readonly string[];
  consequential: boolean;
  releaseApproved: boolean;
}

export interface ReportEvidenceManifest {
  schemaVersion: string;
  manifestSha256: string;
  items: readonly Readonly<Record<string, unknown>>[];
}

export interface ReportInput {
  idempotencyKey: string;
  caseId: string;
  caseTitle: string;
  parcel: ReportParcelSummary;
  sourceInventory: readonly ReportSourceEntry[];
  timeline: readonly ReportTimelineEntry[];
  completeness: readonly ReportCompletenessEntry[];
  findings: readonly ReportFindingEntry[];
  unresolvedQuestions: readonly string[];
  evidenceManifest: ReportEvidenceManifest;
}

export interface ReportDraft extends ReportInput {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  status: "draft";
  evidenceManifestSha256: string;
}

export interface ReleasedReport extends Omit<ReportDraft, "status"> {
  id: string;
  version: number;
  status: "released";
  approvedBy: string;
  approvedOrganizationId: string;
  correlationId: string;
  releasedAt: string;
  reportSha256: string;
  supersedesReportId?: string;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortedIds(ids: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(ids)].sort(compareStrings));
}

function requireEvidence(label: string, ids: readonly string[]): void {
  if (ids.length === 0) {
    throw new Error(`${label} requires evidence`);
  }
}

function assertSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${label} must be a SHA-256 value`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((entry) => canonicalize(entry));
    if (parentKey.endsWith("Ids") && items.every((entry) => typeof entry === "string")) {
      return [...(items as string[])].sort(compareStrings);
    }
    return items;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "signedUrl" && key !== "artifactUrl" && key !== "downloadUrl")
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, nested]) => [key, canonicalize(nested, key)])
    );
  }
  return value;
}

function canonicalHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function buildReportDraft(input: ReportInput): ReportDraft {
  if (input.idempotencyKey.trim().length === 0) {
    throw new Error("Report idempotency key is required");
  }
  requireEvidence("Parcel summary", input.parcel.evidenceItemIds);
  for (const source of input.sourceInventory) {
    requireEvidence(`Source ${source.sourceId}`, source.evidenceItemIds);
  }
  for (const entry of input.timeline) {
    requireEvidence(`Timeline entry ${entry.id}`, entry.evidenceItemIds);
  }
  for (const finding of input.findings) {
    requireEvidence(`Finding ${finding.id}`, finding.evidenceItemIds);
    if (finding.consequential && !finding.releaseApproved) {
      throw new Error(`Finding ${finding.id} has not completed reviewer approval`);
    }
  }
  for (const entry of input.completeness) {
    if (entry.status === "present") {
      requireEvidence(`Completeness category ${entry.category}`, entry.evidenceItemIds);
    }
  }
  assertSha256(input.evidenceManifest.manifestSha256, "Evidence manifest hash");

  const draft: ReportDraft = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    status: "draft",
    idempotencyKey: input.idempotencyKey.trim(),
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    parcel: {
      ...input.parcel,
      evidenceItemIds: sortedIds(input.parcel.evidenceItemIds)
    },
    sourceInventory: [...input.sourceInventory]
      .sort((left, right) => compareStrings(left.sourceId, right.sourceId))
      .map((source) => ({ ...source, evidenceItemIds: sortedIds(source.evidenceItemIds) })),
    timeline: [...input.timeline]
      .sort((left, right) => {
        const time = compareStrings(left.occurredAt, right.occurredAt);
        if (time !== 0) return time;
        const type = compareStrings(left.eventType, right.eventType);
        if (type !== 0) return type;
        return compareStrings(left.id, right.id);
      })
      .map((entry) => ({ ...entry, evidenceItemIds: sortedIds(entry.evidenceItemIds) })),
    completeness: [...input.completeness]
      .sort((left, right) => compareStrings(left.category, right.category))
      .map((entry) => ({ ...entry, evidenceItemIds: sortedIds(entry.evidenceItemIds) })),
    findings: [...input.findings]
      .sort((left, right) => compareStrings(left.id, right.id))
      .map((finding) => ({ ...finding, evidenceItemIds: sortedIds(finding.evidenceItemIds) })),
    unresolvedQuestions: Object.freeze([...new Set(input.unresolvedQuestions)].sort(compareStrings)),
    evidenceManifest: {
      schemaVersion: input.evidenceManifest.schemaVersion,
      manifestSha256: input.evidenceManifest.manifestSha256,
      items: [...input.evidenceManifest.items]
    },
    evidenceManifestSha256: input.evidenceManifest.manifestSha256
  };

  return deepFreeze(draft);
}

function assertReviewer(reviewer: ReportReviewer): void {
  if (!reviewer.roles.includes("reviewer")) {
    throw new Error("Required role: reviewer");
  }
}

function releaseWithVersion(
  draft: ReportDraft,
  reviewer: ReportReviewer,
  releasedAt: string,
  version: number,
  id: string,
  supersedesReportId?: string
): ReleasedReport {
  assertReviewer(reviewer);
  const withoutHash = {
    ...draft,
    id,
    version,
    status: "released" as const,
    approvedBy: reviewer.userId,
    approvedOrganizationId: reviewer.organizationId,
    correlationId: reviewer.correlationId,
    releasedAt,
    ...(supersedesReportId ? { supersedesReportId } : {})
  };
  const released: ReleasedReport = {
    ...withoutHash,
    reportSha256: canonicalHash(withoutHash)
  };
  assertSha256(released.reportSha256, "Report hash");
  return deepFreeze(released);
}

export function releaseReport(
  draft: ReportDraft,
  reviewer: ReportReviewer,
  releasedAt: string,
  id = randomUUID()
): ReleasedReport {
  return releaseWithVersion(draft, reviewer, releasedAt, 1, id);
}

export function supersedeReport(
  previous: ReleasedReport,
  correctedDraft: ReportDraft,
  reviewer: ReportReviewer,
  occurredAt: string,
  id = randomUUID()
): ReleasedReport {
  if (previous.caseId !== correctedDraft.caseId) {
    throw new Error("A report may supersede only a version for the same case");
  }
  return releaseWithVersion(
    correctedDraft,
    reviewer,
    occurredAt,
    previous.version + 1,
    id,
    previous.id
  );
}
