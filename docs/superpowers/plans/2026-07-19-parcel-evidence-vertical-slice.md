# Parcel-to-Evidence Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first trustworthy CivicLedger workflow from organization-scoped parcel case creation through immutable fixture evidence, timeline and completeness analysis, one reviewed deterministic policy finding, and a versioned evidence report.

**Architecture:** Use a pnpm TypeScript monorepo with a React/Vite web client, Fastify API, plain PostgreSQL migrations and repositories, S3-compatible object storage, and small domain packages with explicit contracts. The first slice uses synthetic fixtures and synchronous orchestration while preserving worker, scheduler, idempotency, audit, and storage boundaries needed for later live-source processing.

**Tech Stack:** Node.js 22.22.3, pnpm 11.11.0, TypeScript 5.9.0, Vitest 4.1.10, Fastify 5.0.0, PostgreSQL 17, `pg` 8.16.3, React 19.2.7, Vite 8.1.5, AWS SDK S3 3.850.0, Docker Compose, Gitleaks.

## Global Constraints

- This public repository may contain only synthetic fixtures and public-safe documentation.
- Every organization-owned repository method requires `organizationId` explicitly.
- Cross-organization resource access returns `404`, not `403`.
- Every displayed civic event and factual report assertion references evidence.
- Source observations and released report versions are immutable.
- Reprocessing creates new derivations and never overwrites historical evidence.
- Consequential findings require an append-only human review decision before release.
- Absence of evidence is never described as proof that an event did not occur.
- All timestamps are UTC ISO-8601 strings at package boundaries and `timestamptz` in PostgreSQL.
- All identifiers are UUIDs generated server-side.
- Every command and material action carries `organizationId`, `actorId`, `correlationId`, and an idempotency key where retried execution is possible.
- No live county source, billing, redaction, OCR, accessibility remediation, or physical-mail integration is part of this plan.
- No existing civic repository is modified by this plan.

---

## Planned File Map

```text
.github/workflows/ci.yml                 Required validation and security checks
.gitleaks.toml                           Secret-scanning configuration
SECURITY.md                              Security and public-repository handling policy
CONTRIBUTING.md                          Branch, test, migration, and evidence rules
package.json                             Root scripts and exact tool versions
pnpm-workspace.yaml                      Workspace membership
tsconfig.base.json                       Strict shared compiler configuration
vitest.config.ts                         Shared test discovery

apps/api/src/app.ts                      Fastify composition root
apps/api/src/server.ts                   Process entry point
apps/api/src/routes/*.ts                 Cases, parcels, ingestion, review, report endpoints
apps/web/src/*                           Parcel-case review interface
apps/worker/src/index.ts                 Worker boundary and command dispatcher
apps/scheduler/src/index.ts              Scheduler boundary with no live sources enabled

packages/domain/src/index.ts             Canonical types and narrow validators
packages/auth/src/index.ts               Actor context and authorization guards
packages/audit/src/index.ts              Hash-chained audit event contract
packages/evidence/src/index.ts           Hashing, locations, evidence and manifest rules
packages/database/src/*                  Pool, migrations, and tenant-scoped repositories
packages/parcel/src/index.ts             APN and address normalization
packages/policy-engine/src/index.ts      Versioned deterministic rule execution
packages/reporting/src/index.ts          Report assembly and immutable version contract
packages/test-support/src/index.ts       Synthetic identities, parcels, clocks, and fixtures

services/records-watch/src/*             Fixture acquisition and observation creation
services/parcel-analysis/src/index.ts    Timeline and completeness evaluation
services/process-audit/src/index.ts      Finding creation and review-release gate

infra/migrations/001_initial.sql          First relational schema
infra/migrations/001_initial.down.sql     Reversible development migration
infra/compose/docker-compose.yml          PostgreSQL and MinIO local stack
fixtures/parcel-case-001/*                Synthetic source documents and expected metadata
tests/e2e/parcel-report.test.ts           Complete first-release acceptance test
```

---

### Task 1: Establish Repository Governance and Monorepo Tooling

**Files:**
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `.gitignore`
- Create: `.gitleaks.toml`
- Create: `.nvmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: workspace `package.json` and `tsconfig.json` files for every app, package, and service listed in the file map
- Test: `test/repository-structure.test.ts`

**Interfaces:**
- Consumes: approved design in `docs/superpowers/specs/2026-07-19-civic-ledger-design.md`
- Produces: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm audit:dependencies`

- [ ] **Step 1: Write the repository-structure test**

```ts
// test/repository-structure.test.ts
import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const required = [
  "SECURITY.md",
  "CONTRIBUTING.md",
  ".gitleaks.toml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "apps/api/package.json",
  "apps/web/package.json",
  "apps/worker/package.json",
  "apps/scheduler/package.json",
  "packages/domain/package.json",
  "packages/auth/package.json",
  "packages/audit/package.json",
  "packages/evidence/package.json",
  "packages/database/package.json",
  "packages/parcel/package.json",
  "packages/policy-engine/package.json",
  "packages/reporting/package.json",
  "packages/test-support/package.json",
  "services/records-watch/package.json",
  "services/parcel-analysis/package.json",
  "services/process-audit/package.json"
];

describe("repository structure", () => {
  it("contains every first-slice boundary", async () => {
    await Promise.all(required.map((path) => access(path)));
  });

  it("pins the package manager", async () => {
    const root = JSON.parse(await readFile("package.json", "utf8"));
    expect(root.packageManager).toBe("pnpm@11.11.0");
    expect(root.engines.node).toBe("22.22.3");
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-file failure**

Run: `corepack enable && corepack prepare pnpm@11.11.0 --activate && pnpm exec vitest run test/repository-structure.test.ts`

Expected: FAIL because the workspace files do not exist.

- [ ] **Step 3: Create the root package configuration**

```json
{
  "name": "civic-ledger",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.11.0",
  "engines": { "node": "22.22.3" },
  "scripts": {
    "build": "pnpm -r --if-present build",
    "dev": "pnpm -r --parallel --if-present dev",
    "lint": "pnpm -r --if-present lint",
    "test": "vitest run --maxWorkers=1 --no-file-parallelism",
    "typecheck": "pnpm -r --if-present typecheck",
    "migrate": "pnpm --filter @civic-ledger/database migrate",
    "migrate:down": "pnpm --filter @civic-ledger/database migrate:down",
    "audit:dependencies": "pnpm audit --prod --audit-level high"
  },
  "devDependencies": {
    "@types/node": "22.15.0",
    "tsx": "4.20.0",
    "typescript": "5.9.0",
    "vitest": "4.1.10"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 4: Create governance documents with enforceable rules**

`SECURITY.md` must state that the repository is public, synthetic fixtures only, no secrets or real case records, private vulnerability reporting through GitHub Security Advisories, credential rotation after suspected exposure, and no production deployment until OIDC, storage privacy, retention, and authorization gates pass.

`CONTRIBUTING.md` must require branch-based changes, draft PRs, tests before implementation changes, immutable migrations after merge, explicit evidence citations for domain behavior, no copied `.env` files, and source-repository attribution in migration PRs.

- [ ] **Step 5: Add minimal workspace manifests and run validation**

Each workspace package must be private, ESM, use `workspace:*` for internal dependencies, and expose only `src/index.ts` until a narrower public entry point is needed.

Run: `pnpm install --frozen-lockfile=false && pnpm test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add SECURITY.md CONTRIBUTING.md .gitignore .gitleaks.toml .nvmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts apps packages services test
git commit -m "chore: establish CivicLedger workspace"
```

---

### Task 2: Define Canonical Domain and Parcel Contracts

**Files:**
- Create: `packages/domain/src/index.ts`
- Create: `packages/domain/test/domain.test.ts`
- Create: `packages/parcel/src/index.ts`
- Create: `packages/parcel/test/parcel.test.ts`

**Interfaces:**
- Produces: `OrganizationId`, `UserId`, `ParcelId`, `CaseId`, `EvidenceItemId`, `FindingId`, `ReportId`, `UtcTimestamp`, `Parcel`, `CivicCase`, `CivicEvent`, `assertUuid`, `assertUtcTimestamp`, `normalizeApn`, `normalizeAddress`

- [ ] **Step 1: Write failing parcel and domain tests**

```ts
import { describe, expect, it } from "vitest";
import { assertUtcTimestamp, assertUuid } from "../src/index.js";

describe("domain validators", () => {
  it("accepts canonical UUID and UTC timestamps", () => {
    expect(assertUuid("11111111-1111-4111-8111-111111111111")).toBeDefined();
    expect(assertUtcTimestamp("2026-07-19T20:00:00.000Z")).toBeDefined();
  });

  it("rejects local timestamps", () => {
    expect(() => assertUtcTimestamp("2026-07-19T20:00:00-07:00")).toThrow("UTC");
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { normalizeAddress, normalizeApn } from "../src/index.js";

describe("parcel normalization", () => {
  it("normalizes Humboldt-style APNs without inventing digits", () => {
    expect(normalizeApn(" 123-456-007-000 ")).toBe("123456007000");
  });

  it("normalizes address whitespace and case", () => {
    expect(normalizeAddress("  100   Main st., McKinleyville CA ")).toBe("100 MAIN ST MCKINLEYVILLE CA");
  });
});
```

- [ ] **Step 2: Run tests and confirm missing exports**

Run: `pnpm --filter @civic-ledger/domain test && pnpm --filter @civic-ledger/parcel test`

Expected: FAIL with missing module exports.

- [ ] **Step 3: Implement narrow validators and canonical interfaces**

```ts
// packages/domain/src/index.ts
export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;
export type ParcelId = Brand<string, "ParcelId">;
export type CaseId = Brand<string, "CaseId">;
export type ObservationId = Brand<string, "ObservationId">;
export type EvidenceItemId = Brand<string, "EvidenceItemId">;
export type FindingId = Brand<string, "FindingId">;
export type ReportId = Brand<string, "ReportId">;
export type UtcTimestamp = Brand<string, "UtcTimestamp">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid<T extends string>(value: string): Brand<string, T> {
  if (!UUID.test(value)) throw new Error("Expected UUID");
  return value as Brand<string, T>;
}

export function assertUtcTimestamp(value: string): UtcTimestamp {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error("Expected UTC timestamp ending in Z");
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

export interface CivicEvent {
  id: string;
  organizationId: OrganizationId;
  caseId: CaseId;
  eventType: "notice" | "hearing" | "enforcement_action" | "recorded_instrument" | "transfer" | "permit";
  occurredAt: UtcTimestamp;
  summary: string;
  evidenceItemIds: readonly EvidenceItemId[];
}
```

```ts
// packages/parcel/src/index.ts
export function normalizeApn(value: string): string {
  const normalized = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (normalized.length < 6 || normalized.length > 20) throw new Error("Invalid APN");
  return normalized;
}

export function normalizeAddress(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^0-9A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 5) throw new Error("Invalid address");
  return normalized;
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @civic-ledger/domain test && pnpm --filter @civic-ledger/parcel test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain packages/parcel
git commit -m "feat: define civic domain contracts"
```

---

### Task 3: Enforce Evidence Hashing, Locations, and Manifest Invariants

**Files:**
- Create: `packages/evidence/src/index.ts`
- Create: `packages/evidence/test/evidence.test.ts`

**Interfaces:**
- Consumes: `ObservationId`, `EvidenceItemId`, `UtcTimestamp`
- Produces: `sha256`, `EvidenceLocation`, `EvidenceItem`, `assertEvidenceItem`, `EvidenceManifest`, `buildEvidenceManifest`

- [ ] **Step 1: Write failing evidence tests**

```ts
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

describe("evidence", () => {
  it("produces stable SHA-256 values", () => {
    expect(item.sourceSha256).toHaveLength(64);
  });

  it("deduplicates and sorts manifest items", () => {
    const manifest = buildEvidenceManifest([item, item]);
    expect(manifest.items).toHaveLength(1);
    expect(manifest.manifestSha256).toHaveLength(64);
  });

  it("rejects evidence without a resolvable location", async () => {
    const invalid = { ...item, location: undefined };
    expect(() => buildEvidenceManifest([invalid as never])).toThrow("location");
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @civic-ledger/evidence test`

Expected: FAIL because evidence functions are not implemented.

- [ ] **Step 3: Implement evidence contracts**

```ts
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

export function assertEvidenceItem(item: EvidenceItem): void {
  if (!item.location) throw new Error("Evidence location is required");
  if (!/^[0-9a-f]{64}$/.test(item.sourceSha256)) throw new Error("Invalid source SHA-256");
  if (item.excerpt.trim().length === 0) throw new Error("Evidence excerpt is required");
}

export function buildEvidenceManifest(input: readonly EvidenceItem[]): EvidenceManifest {
  input.forEach(assertEvidenceItem);
  const items = [...new Map(input.map((item) => [item.id, item])).values()]
    .sort((left, right) => left.id.localeCompare(right.id));
  const canonical = JSON.stringify(items);
  return {
    schemaVersion: "civic-ledger.evidence-manifest.v1",
    items,
    manifestSha256: sha256(Buffer.from(canonical))
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @civic-ledger/evidence test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/evidence
git commit -m "feat: enforce evidence invariants"
```

---

### Task 4: Create PostgreSQL Schema and Tenant-Scoped Repositories

**Files:**
- Create: `infra/migrations/001_initial.sql`
- Create: `infra/migrations/001_initial.down.sql`
- Create: `packages/database/src/pool.ts`
- Create: `packages/database/src/migrate.ts`
- Create: `packages/database/src/repositories.ts`
- Create: `packages/database/test/repositories.integration.test.ts`
- Create: `infra/compose/docker-compose.yml`

**Interfaces:**
- Produces: `Database`, `CaseRepository`, `ObservationRepository`, `EvidenceRepository`, `FindingRepository`, `ReviewRepository`, `ReportRepository`, `AuditRepository`
- Repository lookups use `{ organizationId, id }` and return `null` for missing or cross-organization rows.

- [ ] **Step 1: Write the cross-organization integration test**

```ts
it("does not reveal another organization's case", async () => {
  const caseId = await cases.create({
    organizationId: ORG_A,
    actorId: USER_A,
    parcelId: PARCEL_ID,
    title: "Synthetic parcel case",
    correlationId: CORRELATION_ID
  });

  expect(await cases.findById({ organizationId: ORG_A, caseId })).not.toBeNull();
  expect(await cases.findById({ organizationId: ORG_B, caseId })).toBeNull();
});
```

- [ ] **Step 2: Start PostgreSQL and verify the test fails before migration**

Run: `docker compose -f infra/compose/docker-compose.yml up -d postgres && pnpm --filter @civic-ledger/database test`

Expected: FAIL with missing tables.

- [ ] **Step 3: Create the initial migration**

The migration must create these tables with UUID primary keys and `timestamptz` timestamps:

- `organizations`
- `users`
- `organization_memberships`
- `sources`
- `parcels`
- `cases`
- `acquisitions`
- `documents`
- `observations`
- `evidence_items`
- `civic_events`
- `civic_event_evidence`
- `policy_requirements`
- `findings`
- `finding_evidence`
- `review_decisions`
- `reports`
- `report_evidence`
- `audit_events`
- `idempotency_records`

Every organization-owned table must include `organization_id NOT NULL REFERENCES organizations(id)`. Add composite indexes beginning with `organization_id` for all tenant lookups. Add uniqueness constraints for acquisition and report idempotency keys. Prevent updates and deletes on `observations`, `review_decisions`, released `reports`, and `audit_events` through repository behavior and database triggers.

- [ ] **Step 4: Implement explicit repository methods**

```ts
export interface CaseRepository {
  create(input: {
    organizationId: string;
    actorId: string;
    parcelId: string;
    title: string;
    correlationId: string;
  }): Promise<string>;
  findById(input: { organizationId: string; caseId: string }): Promise<CivicCase | null>;
}
```

Every SQL statement must include `organization_id = $1` in its predicate before the object identifier predicate. No generic `findById(id)` method is permitted for tenant-owned records.

- [ ] **Step 5: Run migration cycling and integration tests**

Run:

```bash
pnpm migrate
pnpm --filter @civic-ledger/database test
pnpm migrate:down
pnpm migrate
pnpm --filter @civic-ledger/database test
```

Expected: every command PASS.

- [ ] **Step 6: Commit**

```bash
git add infra packages/database
git commit -m "feat: add tenant-scoped persistence"
```

---

### Task 5: Add Actor Authorization and Hash-Chained Audit Events

**Files:**
- Create: `packages/auth/src/index.ts`
- Create: `packages/auth/test/auth.test.ts`
- Create: `packages/audit/src/index.ts`
- Create: `packages/audit/test/audit.test.ts`

**Interfaces:**
- Produces: `ActorContext`, `requireRole`, `requireOrganization`, `AuditEventInput`, `appendAuditEvent`, `verifyAuditChain`

- [ ] **Step 1: Write failing authorization and audit tests**

```ts
it("requires reviewer role for consequential review", () => {
  expect(() => requireRole(actor(["professional"]), "reviewer")).toThrow("reviewer");
  expect(requireRole(actor(["reviewer"]), "reviewer").userId).toBe(USER_A);
});

it("detects altered audit history", () => {
  const chain = appendAuditEvent([], event("case.created"));
  const altered = [{ ...chain[0], action: "case.deleted" }];
  expect(verifyAuditChain(altered)).toEqual({ valid: false, invalidIndex: 0 });
});
```

- [ ] **Step 2: Implement actor guards**

```ts
export type Role = "professional" | "reviewer" | "administrator";

export interface ActorContext {
  userId: string;
  organizationId: string;
  roles: readonly Role[];
  correlationId: string;
}

export function requireRole(actor: ActorContext, role: Role): ActorContext {
  if (!actor.roles.includes(role)) throw new Error(`Required role: ${role}`);
  return actor;
}

export function requireOrganization(actor: ActorContext, organizationId: string): ActorContext {
  if (actor.organizationId !== organizationId) throw new Error("Organization mismatch");
  return actor;
}
```

- [ ] **Step 3: Implement deterministic audit chaining**

Each event hash must cover `organizationId`, `actorId`, `action`, `targetType`, `targetId`, `occurredAt`, `correlationId`, `payload`, and `previousHash` in canonical key order. The first event uses 64 zeroes as `previousHash`.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @civic-ledger/auth test && pnpm --filter @civic-ledger/audit test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/auth packages/audit
git commit -m "feat: add authorization and audit contracts"
```

---

### Task 6: Implement Idempotent Synthetic Fixture Acquisition

**Files:**
- Create: `fixtures/parcel-case-001/parcel.json`
- Create: `fixtures/parcel-case-001/notice.txt`
- Create: `fixtures/parcel-case-001/hearing.txt`
- Create: `fixtures/parcel-case-001/enforcement-action.txt`
- Create: `fixtures/parcel-case-001/manifest.json`
- Create: `services/records-watch/src/fixture-adapter.ts`
- Create: `services/records-watch/src/acquire.ts`
- Create: `services/records-watch/test/acquire.test.ts`
- Create: `packages/test-support/src/index.ts`

**Interfaces:**
- Produces: `FixtureSourceAdapter`, `AcquisitionCommand`, `AcquisitionResult`, `acquireFixtureSet`
- `acquireFixtureSet` returns the original acquisition ID for duplicate `{ organizationId, sourceId, idempotencyKey }`.

- [ ] **Step 1: Create a synthetic fixture with one intentionally absent expected record**

The fixture must describe a fictional parcel and fictional agency. It must include a notice, hearing, and enforcement action. Its manifest must declare an expected recorded-instrument category with no corresponding file so completeness evaluation can identify missing evidence without claiming the instrument never existed.

- [ ] **Step 2: Write the idempotency test**

```ts
it("does not create duplicate observations for the same idempotency key", async () => {
  const command = {
    organizationId: ORG_A,
    actorId: USER_A,
    sourceId: SOURCE_ID,
    fixtureDirectory: "fixtures/parcel-case-001",
    idempotencyKey: "parcel-case-001-v1",
    correlationId: CORRELATION_ID
  };

  const first = await acquireFixtureSet(dependencies, command);
  const second = await acquireFixtureSet(dependencies, command);

  expect(second.acquisitionId).toBe(first.acquisitionId);
  expect(await observations.countForAcquisition(first.acquisitionId)).toBe(3);
});
```

- [ ] **Step 3: Implement the adapter**

The adapter must:

1. read only paths declared in `manifest.json`;
2. reject absolute paths and `..` traversal;
3. calculate SHA-256 over source bytes;
4. store bytes under `organizations/{organizationId}/sources/{sourceId}/sha256/{hash}`;
5. create immutable document and observation records;
6. persist source-relative location metadata;
7. emit acquisition and audit records;
8. return explicit `succeeded`, `retryable_failure`, or `terminal_failure` state.

- [ ] **Step 4: Run unit and integration tests**

Run: `pnpm --filter @civic-ledger/records-watch test`

Expected: PASS, including duplicate-input and path-traversal cases.

- [ ] **Step 5: Commit**

```bash
git add fixtures packages/test-support services/records-watch
git commit -m "feat: ingest immutable synthetic evidence"
```

---

### Task 7: Build Evidence-Linked Timeline and Completeness Evaluation

**Files:**
- Create: `services/parcel-analysis/src/index.ts`
- Create: `services/parcel-analysis/test/analysis.test.ts`

**Interfaces:**
- Consumes: parcel, observations, evidence items, expected categories
- Produces: `TimelineEntry`, `CompletenessCategory`, `ParcelAnalysis`, `analyzeParcelCase`

- [ ] **Step 1: Write the failing analysis test**

```ts
it("orders events and separates missing from unavailable evidence", () => {
  const analysis = analyzeParcelCase(fixtureAnalysisInput());

  expect(analysis.timeline.map((entry) => entry.eventType)).toEqual([
    "notice",
    "hearing",
    "enforcement_action"
  ]);
  expect(analysis.timeline.every((entry) => entry.evidenceItemIds.length > 0)).toBe(true);
  expect(analysis.completeness).toContainEqual({
    category: "recorded_instrument",
    status: "missing_expected_evidence",
    evidenceItemIds: [],
    explanation: "The fixture expects this category, but no matching evidence was acquired. This does not prove the record does not exist."
  });
});
```

- [ ] **Step 2: Implement deterministic timeline assembly**

Sort by `occurredAt`, then `eventType`, then event UUID. Reject any event with zero evidence references.

- [ ] **Step 3: Implement completeness statuses**

```ts
export type CompletenessStatus =
  | "present"
  | "missing_expected_evidence"
  | "unavailable_source"
  | "ambiguous_match"
  | "stale_observation"
  | "review_required";

export interface CompletenessCategory {
  category: string;
  status: CompletenessStatus;
  evidenceItemIds: readonly string[];
  explanation: string;
}
```

The exact missing-evidence explanation from the test is required wherever expected evidence was not acquired.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @civic-ledger/parcel-analysis test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/parcel-analysis
git commit -m "feat: analyze parcel evidence completeness"
```

---

### Task 8: Add a Versioned Policy Rule and Human Review Gate

**Files:**
- Create: `packages/policy-engine/src/index.ts`
- Create: `packages/policy-engine/test/policy.test.ts`
- Create: `services/process-audit/src/index.ts`
- Create: `services/process-audit/test/review.test.ts`

**Interfaces:**
- Produces: `PolicyRule`, `PolicyEvaluation`, `evaluateRule`, `createFinding`, `recordReviewDecision`, `canReleaseFinding`

- [ ] **Step 1: Define the first synthetic rule**

Rule ID: `synthetic.notice-before-hearing.v1`.

The rule evaluates only approved synthetic events. It returns:

- `satisfied` when a notice event predates the hearing;
- `apparently_unsatisfied` when both exist and notice is not earlier;
- `indeterminate` when either event is missing or ambiguous;
- `review_required` when evidence exists but has not been human approved.

It is an evidence-ordering rule, not a legal conclusion.

- [ ] **Step 2: Write policy and release-gate tests**

```ts
it("returns review_required before evidence approval", () => {
  const result = evaluateRule(noticeBeforeHearingRule, unreviewedFacts());
  expect(result.status).toBe("review_required");
  expect(result.ruleVersion).toBe("1.0.0");
});

it("does not release a consequential finding without reviewer approval", () => {
  const finding = createFinding(reviewRequiredEvaluation());
  expect(canReleaseFinding(finding, [])).toBe(false);
  const decision = recordReviewDecision({
    findingId: finding.id,
    actor: reviewerActor,
    disposition: "approved",
    rationale: "Synthetic evidence order verified",
    occurredAt: NOW
  });
  expect(canReleaseFinding(finding, [decision])).toBe(true);
});
```

- [ ] **Step 3: Implement immutable review decisions**

Allowed dispositions are `approved`, `rejected`, `corrected`, `deferred`, and `superseded`. A superseding decision references the prior decision ID; it never updates or deletes the prior record.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @civic-ledger/policy-engine test && pnpm --filter @civic-ledger/process-audit test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/policy-engine services/process-audit
git commit -m "feat: require review for process findings"
```

---

### Task 9: Generate Immutable Versioned Reports and Evidence Manifests

**Files:**
- Create: `packages/reporting/src/index.ts`
- Create: `packages/reporting/test/reporting.test.ts`

**Interfaces:**
- Consumes: case, parcel, analysis, releasable findings, evidence manifest, reviewer metadata
- Produces: `ReportDraft`, `ReleasedReport`, `buildReportDraft`, `releaseReport`, `supersedeReport`

- [ ] **Step 1: Write report-invariant tests**

```ts
it("rejects factual timeline entries without evidence", () => {
  const input = reportInput({ timelineEvidenceItemIds: [] });
  expect(() => buildReportDraft(input)).toThrow("evidence");
});

it("creates an immutable released version", () => {
  const released = releaseReport(validDraft(), reviewerActor, NOW);
  expect(released.version).toBe(1);
  expect(released.status).toBe("released");
  expect(released.reportSha256).toHaveLength(64);
  expect(Object.isFrozen(released)).toBe(true);
});
```

- [ ] **Step 2: Implement canonical report serialization**

The report schema version is `civic-ledger.report.v1`. Canonical serialization sorts object keys and all ID arrays. The report hash excludes transient signed URLs and includes the evidence-manifest hash.

- [ ] **Step 3: Implement superseding versions**

`supersedeReport(previous, correctedDraft, reviewer, occurredAt)` creates version `previous.version + 1`, stores `supersedesReportId`, and leaves the prior version unchanged.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @civic-ledger/reporting test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/reporting
git commit -m "feat: generate immutable evidence reports"
```

---

### Task 10: Expose the First Slice Through a Fastify API

**Files:**
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/plugins/actor.ts`
- Create: `apps/api/src/routes/parcels.ts`
- Create: `apps/api/src/routes/cases.ts`
- Create: `apps/api/src/routes/acquisitions.ts`
- Create: `apps/api/src/routes/reviews.ts`
- Create: `apps/api/src/routes/reports.ts`
- Create: `apps/api/test/api.test.ts`

**Interfaces:**
- Produces endpoints:
  - `GET /v1/parcels?apn=`
  - `POST /v1/cases`
  - `GET /v1/cases/:caseId`
  - `POST /v1/cases/:caseId/acquisitions/fixture`
  - `GET /v1/cases/:caseId/analysis`
  - `POST /v1/findings/:findingId/reviews`
  - `POST /v1/cases/:caseId/reports`
  - `GET /v1/reports/:reportId`

- [ ] **Step 1: Write API authorization tests**

```ts
it("returns 404 for another organization's case", async () => {
  const response = await app.inject({
    method: "GET",
    url: `/v1/cases/${ORG_A_CASE_ID}`,
    headers: testIdentityHeaders({ organizationId: ORG_B })
  });
  expect(response.statusCode).toBe(404);
});

it("requires reviewer role for finding approval", async () => {
  const response = await app.inject({
    method: "POST",
    url: `/v1/findings/${FINDING_ID}/reviews`,
    headers: testIdentityHeaders({ roles: ["professional"] }),
    payload: { disposition: "approved", rationale: "Checked" }
  });
  expect(response.statusCode).toBe(403);
});
```

- [ ] **Step 2: Implement development actor injection**

Outside production only, accept signed deterministic test-identity headers generated by `packages/test-support`. In production, startup must fail unless OIDC issuer, audience, and JWKS configuration are supplied. Never trust raw `organizationId` or role headers in production.

- [ ] **Step 3: Implement route schemas and orchestration**

Fastify route schemas must reject unknown fields, malformed UUIDs, invalid APNs, empty review rationale, and missing idempotency keys. Route handlers call services and repositories; they contain no SQL or evidence logic.

- [ ] **Step 4: Run API tests**

Run: `pnpm --filter @civic-ledger/app-api test && pnpm --filter @civic-ledger/app-api typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: expose parcel evidence API"
```

---

### Task 11: Build the Reviewable Parcel Case Web Interface

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Create: `apps/web/src/api.ts`
- Create: `apps/web/src/components/parcel-search.tsx`
- Create: `apps/web/src/components/case-summary.tsx`
- Create: `apps/web/src/components/evidence-timeline.tsx`
- Create: `apps/web/src/components/completeness-matrix.tsx`
- Create: `apps/web/src/components/finding-review.tsx`
- Create: `apps/web/src/components/report-panel.tsx`
- Create: `apps/web/src/app.test.tsx`
- Create: `apps/web/src/accessibility.test.tsx`

**Interfaces:**
- Consumes: API endpoints from Task 10
- Produces: one authenticated application shell supporting parcel selection, case creation, fixture ingestion, timeline inspection, completeness inspection, finding review, and report generation

- [ ] **Step 1: Write the primary UI test**

```tsx
it("shows evidence for every timeline entry and warns about missing evidence", async () => {
  render(<App api={fixtureApiClient()} />);
  await userEvent.type(screen.getByLabelText("Parcel APN"), "123-456-007-000");
  await userEvent.click(screen.getByRole("button", { name: "Search parcels" }));
  await userEvent.click(await screen.findByRole("button", { name: "Open synthetic parcel" }));

  expect(await screen.findByText("Evidence timeline")).toBeVisible();
  expect(screen.getAllByRole("link", { name: /View evidence/ })).toHaveLength(3);
  expect(screen.getByText(/does not prove the record does not exist/i)).toBeVisible();
});
```

- [ ] **Step 2: Implement the application shell**

Use semantic HTML, visible focus states, keyboard-operable controls, accessible names, status announcements, and no color-only status encoding. The shell contains these sections in order:

1. Parcel search
2. Case summary and source freshness
3. Evidence timeline
4. Completeness matrix
5. Process finding and reviewer controls
6. Report version and evidence manifest

- [ ] **Step 3: Implement factual-language constraints**

Use these exact labels:

- `Missing expected evidence`
- `Unavailable source`
- `Ambiguous match`
- `Stale observation`
- `Review required`

The missing-evidence panel must display: `No matching evidence was acquired. This does not prove the record does not exist.`

- [ ] **Step 4: Run UI and accessibility tests**

Run: `pnpm --filter @civic-ledger/app-web test && pnpm --filter @civic-ledger/app-web build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add parcel case review workspace"
```

---

### Task 12: Add Worker Boundaries, End-to-End Release Gate, and CI

**Files:**
- Create: `apps/worker/src/index.ts`
- Create: `apps/scheduler/src/index.ts`
- Create: `tests/e2e/parcel-report.test.ts`
- Create: `.github/workflows/ci.yml`
- Create: `docs/operations/local-development.md`
- Create: `docs/migration/source-inventory.md`

**Interfaces:**
- Worker accepts versioned commands but executes only `fixture.acquire.v1` in this release.
- Scheduler has no enabled live source schedules and exits successfully after reporting that state.
- E2E test proves all 12 first-release acceptance criteria covered by code.

- [ ] **Step 1: Write the complete synthetic end-to-end test**

The test must:

1. seed two organizations and users;
2. search the controlled parcel fixture;
3. create a case for organization A;
4. ingest the fixture twice with the same idempotency key;
5. verify only one acquisition and three observations exist;
6. verify each timeline event has evidence;
7. verify the missing recorded-instrument category uses the required limitation language;
8. execute `synthetic.notice-before-hearing.v1`;
9. verify report release fails before review;
10. approve the finding as an organization-A reviewer;
11. release report version 1 and verify its hashes;
12. verify organization B receives `404` for the case and report.

- [ ] **Step 2: Implement worker and scheduler boundaries**

```ts
export type WorkerCommand = {
  schemaVersion: "fixture.acquire.v1";
  organizationId: string;
  actorId: string;
  correlationId: string;
  idempotencyKey: string;
  sourceId: string;
  fixtureDirectory: string;
};
```

Unknown command versions must return terminal failure without execution. The scheduler must not contain a default live URL.

- [ ] **Step 3: Create CI**

The workflow must:

- use `permissions: contents: read`;
- use Node 22.22.3 and pnpm 11.11.0;
- run `pnpm install --frozen-lockfile`;
- run Gitleaks over full history;
- start PostgreSQL 17 and MinIO service containers;
- run migration up, down, and up;
- run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`;
- run `pnpm audit:dependencies`;
- upload no source documents or database dumps as artifacts;
- use job timeouts;
- contain no production secrets.

- [ ] **Step 4: Run the local release gate**

Run:

```bash
docker compose -f infra/compose/docker-compose.yml up -d
pnpm install --frozen-lockfile
pnpm migrate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit:dependencies
```

Expected: every command PASS, with no live external request.

- [ ] **Step 5: Document local development and migration provenance**

`docs/migration/source-inventory.md` must map each adopted concept to its source repository and explicitly state whether code was copied, adapted, or independently reimplemented. Do not claim migration completion for any source repository in this first slice.

- [ ] **Step 6: Commit**

```bash
git add .github apps/worker apps/scheduler tests docs/operations docs/migration
git commit -m "test: add CivicLedger release gate"
```

---

## Final Verification

- [ ] Run `git status --short` and confirm no generated secrets, fixture outputs, database files, object-storage files, or `.env` files are tracked.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Run migration up, down, and up.
- [ ] Run Gitleaks against the complete branch history.
- [ ] Run `pnpm audit:dependencies`.
- [ ] Confirm the synthetic E2E test performs no live network request.
- [ ] Confirm every timeline event and report assertion has evidence.
- [ ] Confirm report release fails before reviewer approval.
- [ ] Confirm cross-organization case and report access returns `404`.
- [ ] Confirm no existing civic repository was changed.

## Deferred Follow-On Plans

The following require separate design or implementation plans after the first vertical slice passes its release gate:

1. one approved Humboldt live-source shadow adapter;
2. broader FairProcess rule migration;
3. PermitSignal commercial opportunity intelligence;
4. CodeSale neutral relationship analysis;
5. RedactDesk isolated redaction worker;
6. AccessForge isolated accessibility worker;
7. MailMyPDF verified-payment delivery;
8. billing and subscription entitlements;
9. source-repository retirement.
