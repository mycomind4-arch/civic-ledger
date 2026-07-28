# CivicLedger

Shared contracts, types, and JSON schemas for the Humboldt civic-tech ecosystem.

CivicLedger provides the type definitions, API contracts, and integration patterns that connect the independent civic products into a coherent system through [CivicLedger Hub](https://github.com/mycomind4-arch/civic-ledger-hub).

## Package

```bash
npm install @humboldt/civic-ledger
```

```typescript
import { type AuditEvent, type Organization, type ParcelReference, schemas } from "@humboldt/civic-ledger";

// Use types for compile-time safety
const event: AuditEvent = {
  id: crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  organizationId: orgId,
  actor: { type: "service", id: "fairprocess-api" },
  action: "report.generated",
  resource: { type: "report", id: reportId },
  outcome: "succeeded",
  source: "fairprocess",
};

// Use schemas for runtime validation
import { schemas } from "@humboldt/civic-ledger";
// Pass to any JSON Schema 2020-12 validator (ajv, @hyperjump/json-schema, etc.)
```

## What's included

| Export | Description |
| --- | --- |
| `AuditEvent`, `AuditActor`, `AuditResource`, `AuditOutcome` | Audit trail event for every consequential action |
| `DocumentReference` | Document with SHA-256 hash, release state, and retention metadata |
| `NotificationPreference` | Per-subject notification channels, topics, and quiet hours |
| `Organization` | Participating organization (county, city, tribal, nonprofit, business, etc.) |
| `ParcelReference` | Assessor parcel with canonical ID and optional GeoJSON centroid |
| `schemas` | All 5 JSON Schema files (draft 2020-12) for runtime validation |
| `schemaIds` | Canonical `$id` URIs for each schema |
| `CIVIC_LEDGER_VERSION` | Current package version string |
| `fairProcessReportToCivicProblem` | Integration contract: FairProcess → Ruth Problem Solver |

## Schemas

All schemas are JSON Schema draft 2020-12, located in [`schemas/`](schemas/):

| Schema | $id | Required fields |
| --- | --- | --- |
| [audit-event](schemas/audit-event.schema.json) | `…/audit-event.schema.json` | id, occurredAt, organizationId, actor, action, resource, outcome, source |
| [document-reference](schemas/document-reference.schema.json) | `…/document-reference.schema.json` | id, organizationId, sourceSystem, sourceId, fileName, mediaType, sha256, releaseState, createdAt |
| [notification-preference](schemas/notification-preference.schema.json) | `…/notification-preference.schema.json` | subjectId, organizationId, channels, topics, updatedAt |
| [organization](schemas/organization.schema.json) | `…/organization.schema.json` | id, name, organizationType, status, createdAt |
| [parcel-reference](schemas/parcel-reference.schema.json) | `…/parcel-reference.schema.json` | jurisdiction, apn, canonicalId, sourceSystem, observedAt |

## Design Principles

- Every factual report assertion must link to evidence.
- Source observations and released report versions are immutable.
- Absence of evidence is not presented as evidence that an event did not occur.
- Consequential findings require human approval.
- CivicLedger is an independent initiative and does not claim government endorsement.
- The product does not make automated legal determinations.

## Products in the ecosystem

| Repository | Role | Status |
| --- | --- | --- |
| [AccessForge](https://github.com/mycomind4-arch/AccessForge) | Document accessibility auditing and remediation | Most mature (v1.34.0, 1410 tests, MIT) |
| [FairProcess](https://github.com/mycomind4-arch/FairProcess) | Procedural integrity for code enforcement | Well-architected, needs pilot partner |
| [ruth-solv-flow](https://github.com/mycomind4-arch/ruth-solv-flow) | Civic problem-solving and execution tracking | Functional prototype, integrating with FairProcess |
| [permitsignal](https://github.com/mycomind4-arch/permitsignal) | Permit and bid intelligence | Revenue-first foundation, functional |
| [humboldt-records-watch](https://github.com/mycomind4-arch/humboldt-records-watch) | Public records acquisition and change detection | Early stage |
| [redact-desk](https://github.com/mycomind4-arch/redact-desk) | Review-gated document redaction | Functional, needs auth hardening |
| [ParcelProof](https://github.com/mycomind4-arch/ParcelProof) | Parcel due-diligence workspace | Functional, browser-based |
| [TrustTrace](https://github.com/mycomind4-arch/TrustTrace) | Evidence-backed scam investigation | Functional |
| [mailmypdf](https://github.com/mycomind4-arch/mailmypdf) | Document-to-physical-mail service | Actively developed |
| [code-sale-finder](https://github.com/mycomind4-arch/code-sale-finder) | Code-enforcement property sale tracker | Functional |
| [civic-ledger-hub](https://github.com/mycomind4-arch/civic-ledger-hub) | Unified web portal connecting all products | Early stage, routes scaffolded |

## Revenue priorities

1. **AccessForge** — WCAG compliance is legally required for government and education. Closest to revenue.
2. **PermitSignal** — Contractors pay for structured permit/bid alerts. Revenue-first design.
3. **FairProcess** — Civic moonshot. Needs a pilot partner to move forward.

## Development

```bash
npm install
npm run build   # TypeScript → dist/
npm test        # Build + run 14 tests
```

## License

MIT
