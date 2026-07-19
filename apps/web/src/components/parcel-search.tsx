import type { FormEvent } from "react";
import type { ParcelCandidate } from "../api.js";

interface ParcelSearchProps {
  apn: string;
  results: readonly ParcelCandidate[];
  busy: boolean;
  onApnChange(value: string): void;
  onSearch(): void;
  onOpen(parcel: ParcelCandidate): void;
}

export function ParcelSearch(props: ParcelSearchProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    props.onSearch();
  }

  return (
    <section aria-labelledby="parcel-search-heading">
      <h2 id="parcel-search-heading">Parcel search</h2>
      <form onSubmit={submit}>
        <label htmlFor="parcel-apn">Parcel APN</label>
        <div className="control-row">
          <input
            id="parcel-apn"
            name="apn"
            value={props.apn}
            onChange={(event) => props.onApnChange(event.currentTarget.value)}
            autoComplete="off"
            required
          />
          <button type="submit" disabled={props.busy}>
            Search parcels
          </button>
        </div>
      </form>
      {props.results.length === 0 ? null : (
        <ul className="result-list" aria-label="Parcel results">
          {props.results.map((parcel) => (
            <li key={parcel.id}>
              <div>
                <strong>{parcel.apn}</strong>
                <span>{parcel.address}</span>
              </div>
              <button type="button" onClick={() => props.onOpen(parcel)} disabled={props.busy}>
                Open synthetic parcel
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
