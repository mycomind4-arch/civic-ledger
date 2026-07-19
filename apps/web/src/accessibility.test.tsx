import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app.js";
import { fixtureApiClient } from "./api.js";

describe("workspace accessibility structure", () => {
  it("uses labeled controls, live status, and ordered semantic sections", async () => {
    render(<App api={fixtureApiClient()} />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByLabelText("Parcel APN")).toBeRequired();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    fireEvent.change(screen.getByLabelText("Parcel APN"), {
      target: { value: "123-456-007-000" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Search parcels" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open synthetic parcel" }));

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Parcel search",
      "Case summary and source freshness",
      "Evidence timeline",
      "Completeness matrix",
      "Process finding and reviewer controls",
      "Report version and evidence manifest"
    ]);
    expect(screen.getByText("Missing expected evidence")).toBeVisible();
    expect(screen.getByText(/not a legal conclusion/i)).toBeVisible();
  });
});
