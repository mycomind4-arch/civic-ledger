/**
 * Shared integration contract: FairProcess → Ruthless Problem Solver
 *
 * Defines the types for converting FairProcess procedural-integrity findings
 * into Ruth Problem Solver OS problem records.
 *
 * Flow:
 *   1. FairProcess generates an IntegrityReport for a code-enforcement case
 *   2. The report findings (missing records, premature filings, etc.) are
 *      transformed into CivicProblemInputs
 *   3. Ruth ingests these as structured problems with evidence-linked root causes
 *   4. Ruth's AI generates solutions, execution plans, and monitoring
 *
 * Conforms to CivicLedger principles:
 *   - Every root cause assertion links to a FairProcess evidence source
 *   - Human approval required before consequential automation
 *   - Absence of a record is "not located", never "proof of misconduct"
 */

// ── FairProcess source types (mirrored from @fairprocess/case-model) ──

export interface FairProcessSourceReference {
  documentId: string;
  sha256: string;
  page?: number;
  quote?: string;
  extractionMethod: "manual" | "ocr" | "native_text" | "api_import";
  confidence?: number;
  humanVerified: boolean;
}

export interface FairProcessFinding {
  ruleId: string;
  instrumentKind: string;
  servedOn?: string;
  becameFinalOn?: string;
  resolvedOn?: string;
  result: "present" | "not_located" | "premature" | "needs_review";
  matchingInstruments: Array<{
    instrumentNumber: string;
    recordedOn: string;
    instrumentType: string;
    parties?: string[];
    source: FairProcessSourceReference;
  }>;
}

export interface FairProcessCaseSummary {
  caseId: string;
  tenantId: string;
  jurisdiction: string;
  agency?: string;
  agencyCaseNumber?: string;
  apns: string[];
  status: string;
  createdAt: string;
}

export interface FairProcessIntegrityReport {
  schemaVersion: "fairprocess.integrity-report.v1";
  reportId: string;
  caseId: string;
  generatedAt: string;
  authorizedAt?: string;
  publishedAt?: string;
  findings: FairProcessFinding[];
  warnings: string[];
  summary: Record<string, number>;
}

// ── Ruth problem solver target types ──

export interface CivicEvidenceLink {
  caseId: string;
  reportId: string;
  ruleId: string;
  findingResult: "present" | "not_located" | "premature" | "needs_review";
  source: FairProcessSourceReference;
}

export interface CivicRootCause {
  description: string;
  type: "process" | "people" | "technology" | "external" | "resource";
  confidence: number;
  evidence: CivicEvidenceLink;
}

export interface CivicProblemInput {
  title: string;
  problem_statement: string;
  context_constraints: string;
  desired_outcome: string;
  stakeholders: string[];
  source_system: "fairprocess";
  source_case_id: string;
  source_report_id: string;
  evidence_links: CivicEvidenceLink[];
  root_causes: CivicRootCause[];
  symptoms: string[];
  assumptions: string[];
  constraints: string[];
  priority_score: number;
  impact_score: number;
}

// ── Transformation function ──

/**
 * Convert a FairProcess integrity report into a CivicProblemInput
 * suitable for ingestion by the Ruthless Problem Solver OS.
 *
 * Each finding becomes a root cause with an evidence link back to
 * the FairProcess source document. Findings of "not_located" are
 * treated as process gaps to investigate, not as proof of misconduct.
 */
export function fairProcessReportToCivicProblem(
  caseSummary: FairProcessCaseSummary,
  report: FairProcessIntegrityReport,
): CivicProblemInput {
  const findingsNeedingAction = report.findings.filter(
    (f) => f.result !== "present",
  );

  const symptoms: string[] = findingsNeedingAction.map((f) => {
    const kind = f.instrumentKind.replace(/_/g, " ");
    switch (f.result) {
      case "not_located":
        return `${kind} not located in recorder search for case ${caseSummary.agencyCaseNumber ?? caseSummary.caseId}`;
      case "premature":
        return `${kind} recorded before it became final (served ${f.servedOn ?? "unknown"}, filed prematurely)`;
      case "needs_review":
        return `${kind} requires human review — potential procedural irregularity`;
      default:
        return `${kind} has an unresolved status`;
    }
  });

  const rootCauses: CivicRootCause[] = findingsNeedingAction.map((f) => {
    const kind = f.instrumentKind.replace(/_/g, " ");
    let description: string;
    let type: CivicRootCause["type"];

    switch (f.result) {
      case "not_located":
        description = `Required ${kind} was not found in the recorder index. This may indicate a recording failure by the agency, an indexing error, or an incomplete search.`;
        type = "process";
        break;
      case "premature":
        description = `${kind} was recorded before it became final, violating the procedural timeline. The document may have been filed before the appeal period expired.`;
        type = "process";
        break;
      case "needs_review":
        description = `${kind} has characteristics that require human review. The instrument may be misclassified, partially recorded, or contain data discrepancies.`;
        type = "technology";
        break;
      default:
        description = `${kind} has an unresolved procedural status that needs investigation.`;
        type = "process";
    }

    return {
      description,
      type,
      confidence: f.matchingInstruments[0]?.source?.confidence ?? 80,
      evidence: {
        caseId: caseSummary.caseId,
        reportId: report.reportId,
        ruleId: f.ruleId,
        findingResult: f.result,
        source: f.matchingInstruments[0]?.source ?? {
          documentId: "not_located",
          sha256: "",
          extractionMethod: "manual",
          humanVerified: false,
        },
      },
    };
  });

  const constraints: string[] = [
    "All assertions must link to FairProcess evidence",
    "Absence of a record is 'not located', not proof of misconduct",
    "Consequential actions require human authorization",
    `Jurisdiction: ${caseSummary.jurisdiction}`,
  ];

  if (caseSummary.agency) {
    constraints.push(`Agency: ${caseSummary.agency}`);
  }

  const apnList = caseSummary.apns.join(", ");
  const caseRef = caseSummary.agencyCaseNumber ?? caseSummary.caseId;

  return {
    title: `Procedural integrity issues in code-enforcement case ${caseRef}`,
    problem_statement: `FairProcess audit of case ${caseRef} (APNs: ${apnList}) identified ${findingsNeedingAction.length} procedural finding(s) requiring attention. Findings: ${symptoms.join("; ")}. These findings are evidence-linked and reviewed per FairProcess policy version. No finding constitutes a legal determination.`,
    context_constraints: constraints.join(". ") + ".",
    desired_outcome: `Resolve all ${findingsNeedingAction.length} procedural finding(s) for case ${caseRef}. Each finding should be investigated, documented, and either corrected through proper channels or formally closed with a recorded rationale. All actions must maintain evidence provenance.`,
    stakeholders: caseSummary.agency ? [caseSummary.agency, "Case attorney", "Records division"] : ["Case attorney", "Records division"],
    source_system: "fairprocess",
    source_case_id: caseSummary.caseId,
    source_report_id: report.reportId,
    evidence_links: rootCauses.map((rc) => rc.evidence),
    root_causes: rootCauses,
    symptoms,
    assumptions: [
      "The FairProcess integrity report accurately reflects the recorder search results",
      "Policy rules are current and applicable to this jurisdiction",
      "Recorder search was conducted correctly and comprehensively",
    ],
    constraints,
    priority_score: findingsNeedingAction.some((f) => f.result === "premature") ? 9 : 7,
    impact_score: findingsNeedingAction.length > 3 ? 8 : 6,
  };
}
