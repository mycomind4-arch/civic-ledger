import { useState } from "react";
import type { CaseWorkspace, CivicLedgerApi, ParcelCandidate } from "./api.js";
import { CaseSummary } from "./components/case-summary.js";
import { CompletenessMatrix } from "./components/completeness-matrix.js";
import { EvidenceTimeline } from "./components/evidence-timeline.js";
import { FindingReview } from "./components/finding-review.js";
import { ParcelSearch } from "./components/parcel-search.js";
import { ReportPanel } from "./components/report-panel.js";

export function App({ api }: { api: CivicLedgerApi }) {
  const [apn, setApn] = useState("");
  const [results, setResults] = useState<readonly ParcelCandidate[]>([]);
  const [workspace, setWorkspace] = useState<CaseWorkspace>();
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready. Synthetic fixtures only.");
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  function search() {
    void run(async () => {
      const matches = await api.searchParcels(apn);
      setResults(matches);
      setMessage(matches.length === 0 ? "No controlled parcel fixture matched." : `${matches.length} parcel result available.`);
    });
  }

  function open(parcel: ParcelCandidate) {
    void run(async () => {
      const opened = await api.openParcel(parcel);
      setWorkspace(opened);
      setMessage("Synthetic parcel case opened with source-backed evidence.");
    });
  }

  function approve() {
    if (!workspace) return;
    void run(async () => {
      const reviewed = await api.reviewFinding({ workspace, rationale });
      setWorkspace(reviewed);
      setRationale("");
      setMessage("Reviewer approval recorded.");
    });
  }

  function generate() {
    if (!workspace) return;
    void run(async () => {
      const updated = await api.generateReport(workspace);
      setWorkspace(updated);
      setMessage("Immutable report version generated.");
    });
  }

  return (
    <main>
      <header className="page-header">
        <p className="eyebrow">Synthetic evidence workspace</p>
        <h1>CivicLedger</h1>
        <p>
          Review source-backed civic timelines without claiming government endorsement or legal conclusions.
        </p>
      </header>

      <p role="status" aria-live="polite" className="announcement">{message}</p>
      {error ? <p role="alert" className="error">{error}</p> : null}

      <ParcelSearch
        apn={apn}
        results={results}
        busy={busy}
        onApnChange={setApn}
        onSearch={search}
        onOpen={open}
      />

      {workspace ? (
        <>
          <CaseSummary workspace={workspace} />
          <EvidenceTimeline entries={workspace.timeline} />
          <CompletenessMatrix entries={workspace.completeness} />
          <FindingReview
            finding={workspace.finding}
            rationale={rationale}
            busy={busy}
            onRationaleChange={setRationale}
            onApprove={approve}
          />
          <ReportPanel
            report={workspace.report}
            findingApproved={workspace.finding.approved}
            busy={busy}
            onGenerate={generate}
          />
        </>
      ) : null}
    </main>
  );
}
