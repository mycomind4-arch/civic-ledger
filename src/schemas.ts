/**
 * @file schemas.ts
 * @description JSON Schema registry for runtime validation.
 *
 * Imports raw JSON schema files and exposes them for use with any
 * JSON Schema validator (ajv, @hyperjump/json-schema, etc.).
 */

import auditEventSchema from "../schemas/audit-event.schema.json" with { type: "json" };
import documentReferenceSchema from "../schemas/document-reference.schema.json" with { type: "json" };
import notificationPreferenceSchema from "../schemas/notification-preference.schema.json" with { type: "json" };
import organizationSchema from "../schemas/organization.schema.json" with { type: "json" };
import parcelReferenceSchema from "../schemas/parcel-reference.schema.json" with { type: "json" };

export const schemas = {
  auditEvent: auditEventSchema,
  documentReference: documentReferenceSchema,
  notificationPreference: notificationPreferenceSchema,
  organization: organizationSchema,
  parcelReference: parcelReferenceSchema,
} as const;

export const schemaIds = {
  auditEvent: "https://schemas.humboldt-digital-commons.invalid/audit-event.schema.json",
  documentReference: "https://schemas.humboldt-digital-commons.invalid/document-reference.schema.json",
  notificationPreference: "https://schemas.humboldt-digital-commons.invalid/notification-preference.schema.json",
  organization: "https://schemas.humboldt-digital-commons.invalid/organization.schema.json",
  parcelReference: "https://schemas.humboldt-digital-commons.invalid/parcel-reference.schema.json",
} as const;

export type SchemaName = keyof typeof schemas;
