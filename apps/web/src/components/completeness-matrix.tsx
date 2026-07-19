import type {
  WorkspaceCompletenessEntry,
  WorkspaceCompletenessStatus
} from "../api.js";

const labels: Record<WorkspaceCompletenessStatus, string> = {
  present: "Present",
  missing_expected_evidence: "Missing expected evidence",
  unavailable_source: "Unavailable source",
  ambiguous_match: "Ambiguous match",
  stale_observation: "Stale observation",
  review_required: "Review required"
};

export function CompletenessMatrix({ entries }: { entries: readonly WorkspaceCompletenessEntry[] }) {
  return (
    <section aria-labelledby="completeness-heading">
      <h2 id="completeness-heading">Completeness matrix</h2>
      <div className="table-scroll">
        <table>
          <caption>Expected evidence categories and current evidence state</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Explanation</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.category}>
                <th scope="row">{entry.category}</th>
                <td><span className="status-label">{labels[entry.status]}</span></td>
                <td>{entry.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
