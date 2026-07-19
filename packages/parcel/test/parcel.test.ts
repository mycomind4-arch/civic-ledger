import { describe, expect, it } from "vitest";
import { normalizeAddress, normalizeApn } from "../src/index.js";

describe("parcel normalization", () => {
  it("normalizes Humboldt-style APNs without inventing digits", () => {
    expect(normalizeApn(" 123-456-007-000 ")).toBe("123456007000");
  });

  it("preserves valid alphanumeric parcel identifiers", () => {
    expect(normalizeApn(" ab-123-45 ")).toBe("AB12345");
  });

  it("rejects implausibly short parcel identifiers", () => {
    expect(() => normalizeApn("123")).toThrow("Invalid APN");
  });

  it("normalizes address whitespace and case", () => {
    expect(normalizeAddress("  100   Main st., McKinleyville CA ")).toBe(
      "100 MAIN ST MCKINLEYVILLE CA"
    );
  });

  it("rejects empty normalized addresses", () => {
    expect(() => normalizeAddress(" . ")).toThrow("Invalid address");
  });
});
