import type { CaseWorkspace } from "../api.js";

export function CaseSummary({ workspace }: { workspace: CaseWorkspace }) {
  return (
    <section aria-labelledby="case-summary-heading">
      <h2 id="case-summary-heading">Case summary and source freshness</h2>
      <dl className="summary-grid">
        <div><dt>Case</dt><dd>{workspace.title}</dd></div>
        <div><dt>Parcel</dt><dd>{workspace.parcel.apn}</dd></div>
        <div><dt>Jurisdiction</dt><dd>{workspace.parcel.jurisdiction}</dd></div>
        <div><dt>Address</dt><dd>{workspace.parcel.address}</dd></div>
      </dl>
      <h3>Source inventory</h3>
      <ul>
        {workspace.sources.map((source) => (
          <li key={source.id}>
            <strong>{source.name}</strong>: {source.state}; observed {source.observedAt}
          </li>
        ))}
      </ul>
    </section>
  );
}
