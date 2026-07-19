import type { WorkspaceTimelineEntry } from "../api.js";

export function EvidenceTimeline({ entries }: { entries: readonly WorkspaceTimelineEntry[] }) {
  return (
    <section aria-labelledby="evidence-timeline-heading">
      <h2 id="evidence-timeline-heading">Evidence timeline</h2>
      <ol className="timeline">
        {entries.map((entry) => (
          <li key={entry.id}>
            <time dateTime={entry.occurredAt}>{entry.occurredAt}</time>
            <h3>{entry.eventType}</h3>
            <p>{entry.summary}</p>
            <a href={entry.evidenceHref}>View evidence: {entry.eventType}</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
