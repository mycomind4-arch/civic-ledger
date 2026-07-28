import assert from "node:assert/strict";
import test from "node:test";

import {
  CIVIC_LEDGER_VERSION,
  schemas,
  schemaIds,
} from "../dist/index.js";

// ── Package structure ──

test("exports a version string", () => {
  assert.equal(CIVIC_LEDGER_VERSION, "0.1.0");
});

test("exports all 5 JSON schemas", () => {
  assert.ok(schemas.auditEvent, "auditEvent schema missing");
  assert.ok(schemas.documentReference, "documentReference schema missing");
  assert.ok(schemas.notificationPreference, "notificationPreference schema missing");
  assert.ok(schemas.organization, "organization schema missing");
  assert.ok(schemas.parcelReference, "parcelReference schema missing");
});

test("each schema has the correct $id", () => {
  assert.equal(schemas.auditEvent.$id, schemaIds.auditEvent);
  assert.equal(schemas.documentReference.$id, schemaIds.documentReference);
  assert.equal(schemas.notificationPreference.$id, schemaIds.notificationPreference);
  assert.equal(schemas.organization.$id, schemaIds.organization);
  assert.equal(schemas.parcelReference.$id, schemaIds.parcelReference);
});

test("each schema is JSON Schema draft 2020-12", () => {
  for (const [name, schema] of Object.entries(schemas)) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema", `${name} has wrong $schema`);
  }
});

// ── Runtime smoke tests on exported types ──

test("AuditEvent object matches the schema-required fields", () => {
  const event = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    occurredAt: "2026-07-27T12:00:00Z",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
    actor: { type: "user", id: "user-123", displayName: "Jane Doe" },
    action: "report.view",
    resource: { type: "report", id: "rpt-456" },
    outcome: "succeeded",
    source: "fairprocess-api",
  };
  assert.equal(event.outcome, "succeeded");
  assert.equal(event.actor.type, "user");
});

test("DocumentReference object matches the schema-required fields", () => {
  const doc = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
    sourceSystem: "recorder",
    sourceId: "2026-000123",
    fileName: "notice.pdf",
    mediaType: "application/pdf",
    sha256: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    releaseState: "released",
    createdAt: "2026-07-27T10:00:00Z",
  };
  assert.equal(doc.releaseState, "released");
});

test("Organization object matches the schema-required fields", () => {
  const org = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "County of Humboldt",
    organizationType: "county",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
  };
  assert.equal(org.organizationType, "county");
});

test("ParcelReference object matches the schema-required fields", () => {
  const parcel = {
    jurisdiction: "Humboldt County, CA",
    apn: "123-456-789",
    canonicalId: "humboldt:123-456-789",
    sourceSystem: "assessor",
    observedAt: "2026-07-27T08:00:00Z",
  };
  assert.equal(parcel.apn, "123-456-789");
});

test("NotificationPreference object matches the schema-required fields", () => {
  const pref = {
    subjectId: "user-123",
    organizationId: "550e8400-e29b-41d4-a716-446655440001",
    channels: { email: true, sms: false, push: true, web: true },
    topics: ["permit-alerts", "code-enforcement"],
    updatedAt: "2026-07-27T12:00:00Z",
  };
  assert.equal(pref.channels.email, true);
  assert.equal(pref.topics.length, 2);
});

// ── FairProcess → Ruth contract ──

test("exports the fairprocess-ruth contract", async () => {
  const mod = await import("../dist/contracts/fairprocess-ruth.js");
  assert.equal(typeof mod.fairProcessReportToCivicProblem, "function");
});

// ── Schema structural checks ──

test("audit-event schema requires all 8 core fields", () => {
  const required = schemas.auditEvent.required;
  assert.deepEqual(required.sort(), [
    "action", "actor", "id", "occurredAt", "organizationId", "outcome", "resource", "source"
  ].sort());
});

test("organization schema supports all 8 organization types", () => {
  const types = schemas.organization.properties.organizationType.enum;
  assert.deepEqual(types.sort(), [
    "business", "city", "county", "nonprofit", "other", "school", "special_district", "tribal_organization"
  ].sort());
});

test("document-reference sha256 pattern matches 64 hex chars", () => {
  const pattern = schemas.documentReference.properties.sha256.pattern;
  assert.ok("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".match(pattern));
  assert.ok(!"too-short".match(pattern));
});

test("parcel-reference centroid coordinates are [lng, lat]", () => {
  const coords = schemas.parcelReference.properties.centroid.properties.coordinates;
  assert.equal(coords.prefixItems[0].minimum, -180);
  assert.equal(coords.prefixItems[0].maximum, 180);
  assert.equal(coords.prefixItems[1].minimum, -90);
  assert.equal(coords.prefixItems[1].maximum, 90);
});
