import type { WorkspaceReport } from "../api.js";

interface ReportPanelProps {
  report: WorkspaceReport | undefined;
  findingApproved: boolean;
  busy: boolean;
  onGenerate(): void;
}

export function ReportPanel(props: ReportPanelProps) {
  return (
    <section aria-labelledby="report-heading">
      <h2 id="report-heading">Report version and evidence manifest</h2>
      {props.report ? (
        <dl className="summary-grid">
          <div><dt>Version</dt><dd>{props.report.version}</dd></div>
          <div><dt>Report SHA-256</dt><dd><code>{props.report.reportSha256}</code></dd></div>
          <div><dt>Evidence manifest SHA-256</dt><dd><code>{props.report.evidenceManifestSha256}</code></dd></div>
        </dl>
      ) : (
        <>
          <p>A report can be generated only after reviewer approval.</p>
          <button
            type="button"
            onClick={props.onGenerate}
            disabled={props.busy || !props.findingApproved}
          >
            Generate report
          </button>
        </>
      )}
    </section>
  );
}
