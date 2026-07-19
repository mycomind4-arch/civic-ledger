export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;
export type ParcelId = Brand<string, "ParcelId">;
export type CaseId = Brand<string, "CaseId">;
export type CivicEventId = Brand<string, "CivicEventId">;
export type ObservationId = Brand<string, "ObservationId">;
export type EvidenceItemId = Brand<string, "EvidenceItemId">;
export type FindingId = Brand<string, "FindingId">;
export type ReportId = Brand<string, "ReportId">;
export type UtcTimestamp = Brand<string, "UtcTimestamp">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function assertUuid<Name extends string = "Uuid">(value: string): Brand<string, Name> {
  if (!UUID.test(value)) {
    throw new Error("Expected UUID");
  }

  return value as Brand<string, Name>;
}

export function assertUtcTimestamp(value: string): UtcTimestamp {
  if (!UTC_TIMESTAMP.test(value)) {
    throw new Error("Expected UTC timestamp ending in Z");
  }

  const parsed = new Date(value);
  const normalizedInput = value.includes(".") ? value : value.replace("Z", ".000Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== normalizedInput) {
    throw new Error("Expected valid UTC timestamp");
  }

  return value as UtcTimestamp;
}

export interface Parcel {
  id: ParcelId;
  jurisdiction: string;
  apnNormalized: string;
  addressNormalized: string;
  sourceId: string;
  observedAt: UtcTimestamp;
}

export interface CivicCase {
  id: CaseId;
  organizationId: OrganizationId;
  parcelId: ParcelId;
  title: string;
  status: "open" | "awaiting_review" | "report_ready" | "closed";
  createdAt: UtcTimestamp;
}

export type CivicEventType =
  | "notice"
  | "hearing"
  | "enforcement_action"
  | "recorded_instrument"
  | "transfer"
  | "permit";

export interface CivicEvent {
  id: CivicEventId;
  organizationId: OrganizationId;
  caseId: CaseId;
  eventType: CivicEventType;
  occurredAt: UtcTimestamp;
  summary: string;
  evidenceItemIds: readonly EvidenceItemId[];
}
