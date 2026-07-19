export interface ParcelCandidate {
  id: string;
  apn: string;
  address: string;
  jurisdiction: string;
}

export interface WorkspaceSource {
  id: string;
  name: string;
  state: "available" | "unavailable" | "stale";
  observedAt: string;
}

export interface WorkspaceTimelineEntry {
  id: string;
  eventType: string;
  occurredAt: string;
  summary: string;
  evidenceHref: string;
  evidenceItemIds: readonly string[];
}

export type WorkspaceCompletenessStatus =
  | "present"
  | "missing_expected_evidence"
  | "unavailable_source"
  | "ambiguous_match"
  | "stale_observation"
  | "review_required";

export interface WorkspaceCompletenessEntry {
  category: string;
  status: WorkspaceCompletenessStatus;
  explanation: string;
  evidenceItemIds: readonly string[];
}

export interface WorkspaceFinding {
  id: string;
  ruleId: string;
  ruleVersion: string;
  status: string;
  explanation: string;
  limitation: string;
  approved: boolean;
}

export interface WorkspaceReport {
  id: string;
  version: number;
  reportSha256: string;
  evidenceManifestSha256: string;
}

export interface CaseWorkspace {
  caseId: string;
  title: string;
  parcel: ParcelCandidate;
  sources: readonly WorkspaceSource[];
  timeline: readonly WorkspaceTimelineEntry[];
  completeness: readonly WorkspaceCompletenessEntry[];
  finding: WorkspaceFinding;
  report?: WorkspaceReport;
}

export interface CivicLedgerApi {
  searchParcels(apn: string): Promise<readonly ParcelCandidate[]>;
  openParcel(parcel: ParcelCandidate): Promise<CaseWorkspace>;
  reviewFinding(input: {
    workspace: CaseWorkspace;
    rationale: string;
  }): Promise<CaseWorkspace>;
  generateReport(workspace: CaseWorkspace): Promise<CaseWorkspace>;
}

interface HttpApiOptions {
  baseUrl?: string;
  headers?: () => Readonly<Record<string, string>>;
}

async function requestJson<T>(
  options: HttpApiOptions,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${options.baseUrl ?? ""}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(options.headers?.() ?? {}),
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`CivicLedger API request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export function createHttpApi(options: HttpApiOptions = {}): CivicLedgerApi {
  return {
    searchParcels(apn) {
      return requestJson(options, `/v1/parcels?apn=${encodeURIComponent(apn)}`);
    },
    async openParcel(parcel) {
      const created = await requestJson<{ id: string }>(options, "/v1/cases", {
        method: "POST",
        body: JSON.stringify({ parcelId: parcel.id, title: `Review ${parcel.apn}` })
      });
      await requestJson(options, `/v1/cases/${created.id}/acquisitions/fixture`, {
        method: "POST",
        headers: { "idempotency-key": `fixture-${created.id}` },
        body: JSON.stringify({ fixtureDirectory: "fixtures/parcel-case-001" })
      });
      return requestJson(options, `/v1/cases/${created.id}/analysis`);
    },
    async reviewFinding({ workspace, rationale }) {
      await requestJson(options, `/v1/findings/${workspace.finding.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ disposition: "approved", rationale })
      });
      return {
        ...workspace,
        finding: { ...workspace.finding, approved: true, status: "approved" }
      };
    },
    async generateReport(workspace) {
      const report = await requestJson<WorkspaceReport>(
        options,
        `/v1/cases/${workspace.caseId}/reports`,
        {
          method: "POST",
          headers: { "idempotency-key": `report-${workspace.caseId}-v1` },
          body: "{}"
        }
      );
      return { ...workspace, report };
    }
  };
}

export function fixtureApiClient(): CivicLedgerApi {
  const parcel: ParcelCandidate = {
    id: "66666666-6666-4666-8666-666666666666",
    apn: "123-456-007-000",
    address: "100 Main Street, Exampleville, CA",
    jurisdiction: "Synthetic County"
  };

  const workspace: CaseWorkspace = {
    caseId: "55555555-5555-4555-8555-555555555555",
    title: "Synthetic parcel review",
    parcel,
    sources: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        name: "Exampleville synthetic fixture source",
        state: "available",
        observedAt: "2026-07-19T20:00:00.000Z"
      }
    ],
    timeline: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        eventType: "Notice",
        occurredAt: "2026-01-05T17:00:00.000Z",
        summary: "Synthetic notice",
        evidenceHref: "#evidence-notice",
        evidenceItemIds: ["11111111-1111-4111-8111-111111111111"]
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        eventType: "Hearing",
        occurredAt: "2026-01-20T18:00:00.000Z",
        summary: "Synthetic hearing",
        evidenceHref: "#evidence-hearing",
        evidenceItemIds: ["22222222-2222-4222-8222-222222222222"]
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        eventType: "Enforcement action",
        occurredAt: "2026-02-02T19:00:00.000Z",
        summary: "Synthetic enforcement action",
        evidenceHref: "#evidence-action",
        evidenceItemIds: ["33333333-3333-4333-8333-333333333333"]
      }
    ],
    completeness: [
      {
        category: "Notice",
        status: "present",
        explanation: "Matching source-backed evidence is present.",
        evidenceItemIds: ["11111111-1111-4111-8111-111111111111"]
      },
      {
        category: "Recorded instrument",
        status: "missing_expected_evidence",
        explanation:
          "No matching evidence was acquired. This does not prove the record does not exist.",
        evidenceItemIds: []
      }
    ],
    finding: {
      id: "99999999-9999-4999-8999-999999999999",
      ruleId: "synthetic.notice-before-hearing.v1",
      ruleVersion: "1.0.0",
      status: "review_required",
      explanation: "The evidence ordering requires human review before release.",
      limitation: "This synthetic finding is not a legal conclusion.",
      approved: false
    }
  };

  return {
    async searchParcels(apn) {
      return apn.replace(/[^0-9A-Za-z]/gu, "").toUpperCase() === "123456007000"
        ? [parcel]
        : [];
    },
    async openParcel() {
      return structuredClone(workspace);
    },
    async reviewFinding({ workspace: current }) {
      return {
        ...current,
        finding: { ...current.finding, approved: true, status: "approved" }
      };
    },
    async generateReport(current) {
      return {
        ...current,
        report: {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          version: 1,
          reportSha256: "a".repeat(64),
          evidenceManifestSha256: "b".repeat(64)
        }
      };
    }
  };
}
