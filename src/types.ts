/**
 * @file types.ts
 * @description TypeScript interfaces derived from the JSON schemas in schemas/.
 *
 * These types are the canonical contract between civic-tech products.
 * Products import from @humboldt/civic-ledger and pin a version instead of
 * copying whatever is currently on main.
 */

// ── Audit Event ──

export type AuditActorType = "user" | "service" | "system";

export interface AuditActor {
  type: AuditActorType;
  id: string;
  displayName?: string;
}

export interface AuditResource {
  type: string;
  id: string;
}

export type AuditOutcome = "succeeded" | "failed" | "denied" | "pending";

export interface AuditEvent {
  id: string; // UUID
  occurredAt: string; // date-time
  organizationId: string; // UUID
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  outcome: AuditOutcome;
  source: string;
  correlationId?: string;
  reasonCode?: string;
  metadata?: Record<string, unknown>;
}

// ── Document Reference ──

export type ReleaseState = "internal" | "review" | "approved" | "released" | "withheld";

export interface DocumentReference {
  id: string; // UUID
  organizationId: string; // UUID
  sourceSystem: string;
  sourceId: string;
  fileName: string;
  mediaType: string;
  sha256: string; // 64-char hex
  retentionClass?: string;
  legalHold?: boolean;
  releaseState: ReleaseState;
  createdAt: string; // date-time
  sourceUrl?: string; // URI
  metadata?: Record<string, unknown>;
}

// ── Notification Preference ──

export interface NotificationChannels {
  email: boolean;
  sms: boolean;
  push: boolean;
  web: boolean;
}

export interface QuietHours {
  timezone: string;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface NotificationPreference {
  subjectId: string;
  organizationId: string; // UUID
  channels: NotificationChannels;
  topics: string[];
  quietHours?: QuietHours;
  consentedAt?: string; // date-time
  updatedAt: string; // date-time
}

// ── Organization ──

export type OrganizationType =
  | "county"
  | "city"
  | "tribal_organization"
  | "special_district"
  | "school"
  | "nonprofit"
  | "business"
  | "other";

export type OrganizationStatus = "active" | "suspended" | "closed";

export interface ExternalReference {
  system: string;
  id: string;
}

export interface Organization {
  id: string; // UUID
  name: string;
  organizationType: OrganizationType;
  jurisdiction?: string;
  status: OrganizationStatus;
  createdAt: string; // date-time
  externalReferences?: ExternalReference[];
}

// ── Parcel Reference ──

export interface ParcelCentroid {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ParcelReference {
  jurisdiction: string;
  apn: string;
  canonicalId: string;
  sourceSystem: string;
  observedAt: string; // date-time
  geometryUrl?: string; // URI
  centroid?: ParcelCentroid;
  sourceMetadata?: Record<string, unknown>;
}
