/**
 * @file index.ts
 * @description Main entry point for @humboldt/civic-ledger.
 *
 * Exports all shared types, JSON schemas, and the FairProcess → Ruth
 * integration contract for use across the Humboldt civic-tech ecosystem.
 */

// Types
export type {
  AuditActor,
  AuditActorType,
  AuditEvent,
  AuditOutcome,
  AuditResource,
  DocumentReference,
  ReleaseState,
  NotificationChannels,
  NotificationPreference,
  QuietHours,
  Organization,
  OrganizationType,
  OrganizationStatus,
  ExternalReference,
  ParcelCentroid,
  ParcelReference,
} from "./types.js";

// Schema registry
export { schemas, schemaIds, type SchemaName } from "./schemas.js";

// Schema version
export const CIVIC_LEDGER_VERSION = "0.1.0";
