import { createHash } from "node:crypto";

export type EvidenceLocation =
  | { kind: "page"; page: number }
  | { kind: "selector"; selector: string }
  | { kind: "row"; row: number }
  | { kind: "external"; authoritativeRecordId: string };

export interface EvidenceItem {
  id: string;
  observationId: string;
  sourceSha256: string;
  location: EvidenceLocation;
  excerpt: string;
  observedAt: string;
}

export interface EvidenceManifest {
  schemaVersion: "civic-ledger.evidence-manifest.v1";
  items: readonly EvidenceItem[];
  manifestSha256: string;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertLocation(location: EvidenceLocation | undefined): asserts location is EvidenceLocation {
  if (!location) {
    throw new Error("Evidence location is required");
  }

  switch (location.kind) {
    case "page":
      if (!Number.isInteger(location.page) || location.page < 1) {
        throw new Error("Evidence page location must be a positive integer");
      }
      break;
    case "row":
      if (!Number.isInteger(location.row) || location.row < 1) {
        throw new Error("Evidence row location must be a positive integer");
      }
      break;
    case "selector":
      if (location.selector.trim().length === 0) {
        throw new Error("Evidence selector location is required");
      }
      break;
    case "external":
      if (location.authoritativeRecordId.trim().length === 0) {
        throw new Error("External evidence location requires an authoritative record ID");
      }
      break;
  }
}

export function assertEvidenceItem(item: EvidenceItem): void {
  assertLocation(item.location);
  if (!/^[0-9a-f]{64}$/.test(item.sourceSha256)) {
    throw new Error("Invalid source SHA-256");
  }
  if (item.excerpt.trim().length === 0) {
    throw new Error("Evidence excerpt is required");
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }

  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function buildEvidenceManifest(input: readonly EvidenceItem[]): EvidenceManifest {
  const byId = new Map<string, EvidenceItem>();

  for (const item of input) {
    assertEvidenceItem(item);
    const existing = byId.get(item.id);
    if (existing && canonicalJson(existing) !== canonicalJson(item)) {
      throw new Error(`Conflicting evidence items share ID ${item.id}`);
    }
    byId.set(item.id, item);
  }

  const items = Object.freeze(
    [...byId.values()].sort((left, right) => left.id.localeCompare(right))
  );
  const manifest = {
    schemaVersion: "civic-ledger.evidence-manifest.v1" as const,
    items,
    manifestSha256: sha256(Buffer.from(canonicalJson(items)))
  };

  return Object.freeze(manifest);
}
