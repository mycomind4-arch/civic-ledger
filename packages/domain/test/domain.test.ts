import { describe, expect, it } from "vitest";
import { assertUtcTimestamp, assertUuid } from "../src/index.js";

describe("domain validators", () => {
  it("accepts canonical UUID and UTC timestamps", () => {
    expect(assertUuid("11111111-1111-4111-8111-111111111111")).toBeDefined();
    expect(assertUtcTimestamp("2026-07-19T20:00:00.000Z")).toBeDefined();
    expect(assertUtcTimestamp("2026-07-19T20:00:00Z")).toBeDefined();
  });

  it("rejects local timestamps", () => {
    expect(() => assertUtcTimestamp("2026-07-19T20:00:00-07:00")).toThrow("UTC");
  });

  it("rejects impossible UTC dates", () => {
    expect(() => assertUtcTimestamp("2026-02-30T20:00:00.000Z")).toThrow("valid UTC");
  });

  it("rejects malformed UUIDs", () => {
    expect(() => assertUuid("not-a-uuid")).toThrow("UUID");
  });
});
