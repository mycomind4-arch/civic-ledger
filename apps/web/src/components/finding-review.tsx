import type { FormEvent } from "react";
import type { WorkspaceFinding } from "../api.js";

interface FindingReviewProps {
  finding: WorkspaceFinding;
  rationale: string;
  busy: boolean;
  onRationaleChange(value: string): void;
  onApprove(): void;
}

export function FindingReview(props: FindingReviewProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    props.onApprove();
  }

  return (
    <section aria-labelledby="finding-review-heading">
      <h2 id="finding-review-heading">Process finding and reviewer controls</h2>
      <p><strong>Rule:</strong> {props.finding.ruleId} @ {props.finding.ruleVersion}</p>
      <p><strong>Status:</strong> {props.finding.status}</p>
      <p>{props.finding.explanation}</p>
      <p className="limitation"><strong>Limitation:</strong> {props.finding.limitation}</p>
      {props.finding.approved ? (
        <p>Reviewer approval is present for this finding.</p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="review-rationale">Review rationale</label>
          <textarea
            id="review-rationale"
            value={props.rationale}
            onChange={(event) => props.onRationaleChange(event.currentTarget.value)}
            required
          />
          <button type="submit" disabled={props.busy || props.rationale.trim().length === 0}>
            Approve finding
          </button>
        </form>
      )}
    </section>
  );
}
