import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabasePool, createRepositories, migrate } from "../src/index.js";

const pool = createDatabasePool();
const database = createRepositories(pool);

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const PARCEL_ID = "33333333-3333-4333-8333-333333333333";
const CORRELATION_ID = "44444444-4444-4444-8444-444444444444";

beforeAll(async () => {
  await migrate("up", pool);
});

beforeEach(async () => {
  await pool.query(`
    TRUNCATE TABLE
      idempotency_records, audit_events, report_evidence, reports,
      review_decisions, finding_evidence, findings, policy_requirements,
      civic_event_evidence, civic_events, evidence_items, observations,
      documents, acquisitions, cases, parcels, sources,
      organization_memberships, users, organizations
    CASCADE
  `);

  await pool.query(
    "INSERT INTO organizations(id, name) VALUES ($1, 'Organization A'), ($2, 'Organization B')",
    [ORG_A, ORG_B]
  );
  await pool.query(
    "INSERT INTO users(id, subject, display_name) VALUES ($1, 'user-a', 'User A'), ($2, 'user-b', 'User B')",
    [USER_A, USER_B]
  );
  await pool.query(
    `INSERT INTO organization_memberships(organization_id, user_id, roles)
     VALUES ($1, $2, ARRAY['professional']), ($3, $4, ARRAY['professional'])`,
    [ORG_A, USER_A, ORG_B, USER_B]
  );
  await pool.query(
    `INSERT INTO parcels(
       id, organization_id, jurisdiction, apn_normalized, address_normalized,
       source_id_text, observed_at
     ) VALUES ($1, $2, 'Synthetic County', '123456007000',
       '100 MAIN ST SYNTHETIC CA', 'synthetic-parcels', now())`,
    [PARCEL_ID, ORG_A]
  );
});

afterAll(async () => {
  await pool.end();
});

describe("tenant-scoped repositories", () => {
  it("does not reveal another organization's case", async () => {
    const caseId = await database.cases.create({
      organizationId: ORG_A,
      actorId: USER_A,
      parcelId: PARCEL_ID,
      title: "Synthetic parcel case",
      correlationId: CORRELATION_ID
    });

    expect(await database.cases.findById({ organizationId: ORG_A, caseId })).not.toBeNull();
    expect(await database.cases.findById({ organizationId: ORG_B, caseId })).toBeNull();
  });

  it("prevents mutation of an observation", async () => {
    const sourceId = randomUUID();
    const acquisitionId = randomUUID();
    const documentId = randomUUID();

    await pool.query(
      `INSERT INTO sources(id, organization_id, name, source_type)
       VALUES ($1, $2, 'Synthetic source', 'fixture')`,
      [sourceId, ORG_A]
    );
    await pool.query(
      `INSERT INTO acquisitions(
         id, organization_id, source_id, actor_id, idempotency_key,
         correlation_id, state
       ) VALUES ($1, $2, $3, $4, 'immutable-test', $5, 'succeeded')`,
      [acquisitionId, ORG_A, sourceId, USER_A, CORRELATION_ID]
    );
    await pool.query(
      `INSERT INTO documents(
         id, organization_id, source_id, acquisition_id, sha256, storage_key,
         media_type, byte_length
       ) VALUES ($1, $2, $3, $4, $5, $6, 'text/plain', 9)`,
      [documentId, ORG_A, sourceId, acquisitionId, "a".repeat(64), `synthetic/${documentId}`]
    );

    const observationId = await database.observations.create({
      organizationId: ORG_A,
      acquisitionId,
      documentId,
      observedAt: "2026-07-19T20:00:00.000Z",
      contentType: "text/plain",
      metadata: { fixture: true }
    });

    await expect(
      pool.query("UPDATE observations SET metadata = '{}'::jsonb WHERE id = $1", [observationId])
    ).rejects.toThrow("immutable");
  });
});
