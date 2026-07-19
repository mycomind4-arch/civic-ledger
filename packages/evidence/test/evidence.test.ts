import { describe, expect, it } from "vitest";
import { buildEvidenceManifest, sha256 } from "../src/index.js";

const item = {
  id: "22222222-2222-4222-8222-222222222222",
  observationId: "33333333-3333-4333-8333-333333333333",
  sourceSha256: sha256(Buffer.from("synthetic notice")),
  location: { kind: "page" as const, page: 1 },
  excerpt: "Synthetic notice",
  observedAt: "2026-07-19T20:00:00.000Z"
};

const secondItem = {
  ...item,
  id: "11111111-1111-4111-8111-111111111111",
  excerpt: "Synthetic hearing"
};

describe("evidence", () => {
  it("produces stable SHA-256 values", () => {
    expect(item.sourceSha256).toHaveLength(64);
    expect(sha256(Buffer.from("synthetic notice"))).toBe(item.sourceSha256);
  });

  it("deduplicates and sorts manifest items", () => {
    const manifest = buildEvidenceManifest([item, secondItem, item]);
    expect(manifest.items.map(({ id }) => id)).toEqual([secondItem.id, item.id]);
    expect(manifest.manifestSha256).toHaveLength(64);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.items)).toBe(true);
  });

  it("produces the same manifest hash regardless of input order", () => {
    const forward = buildEvidenceManifest([item, secondItem]);
    const reverse = buildEvidenceManifest([secondItem, item]);
    expect(reverse.manifestSha256).toBe(forward.manifestSha256);
  });

  it("rejects evidence without a resolvable location", () => {
    const invalid = { ...item, location: undefined };
    expect(() => buildEvidenceManifest([invalid as never])).toThrow("location");
  });

  it("rejects invalid page locations", () => {
    const invalid = { ...item, location: { kind: "page" as const, page: 0 } };
    expect(() => buildEvidenceManifest([invalid])).toThrow("positive integer");
  });

  it("rejects conflicting duplicate evidence IDs", () => {
    const conflict = { ...item, excerpt: "Different assertion" };
    expect(() => buildEvidenceManifest([item, conflict])).toThrow("Conflicting evidence");
  });
});
