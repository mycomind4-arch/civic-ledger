import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app.js";
import { fixtureApiClient } from "./api.js";

function openSyntheticParcel() {
  fireEvent.change(screen.getByLabelText("Parcel APN"), {
    target: { value: "123-456-007-000" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Search parcels" }));
}

afterEach(cleanup);

describe("CivicLedger workspace", () => {
  it("shows evidence for every timeline entry and warns about missing evidence", async () => {
    render(<App api={fixtureApiClient()} />);
    openSyntheticParcel();
    fireEvent.click(await screen.findByRole("button", { name: "Open synthetic parcel" }));

    expect(await screen.findByText("Evidence timeline")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /View evidence/ })).toHaveLength(3);
    expect(
      screen.getByText(/No matching evidence was acquired\. This does not prove the record does not exist\./i)
    ).toBeVisible();
  });

  it("records reviewer approval before enabling report generation", async () => {
    render(<App api={fixtureApiClient()} />);
    openSyntheticParcel();
    fireEvent.click(await screen.findByRole("button", { name: "Open synthetic parcel" }));

    const generate = await screen.findByRole("button", { name: "Generate report" });
    expect(generate).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: { value: "Synthetic evidence order checked" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve finding" }));
    expect(await screen.findByText("Reviewer approval recorded.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Generate report" })).toBeEnabled();
  });
});
