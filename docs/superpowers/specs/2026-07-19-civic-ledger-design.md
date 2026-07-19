# CivicLedger Unified Civic Platform Design

**Status:** Approved for implementation planning  
**Date:** 2026-07-19  
**Canonical repository:** `mycomind4-arch/civic-ledger`  
**Governance source:** `mycomind4-arch/humboldt-digital-commons`

## 1. Decision

CivicLedger will provide one coherent civic records, parcel, and procedural-integrity product while preserving independently testable service boundaries.

The platform will not be assembled by copying every source repository into one directory. It will adopt validated contracts and behavior from the existing civic repositories behind a new canonical domain model. Existing repositories remain intact and authoritative during migration and may be archived only after replacement behavior, tests, provenance, exports, and operational documentation are validated in CivicLedger.

The first complete product workflow is:

> Search a parcel, retrieve and preserve its known records, construct a source-backed event timeline, distinguish missing, ambiguous, stale, and unavailable evidence, run a deterministic process rule, require human review for consequential findings, and generate a versioned evidence report.

## 2. First-release boundary

The first release includes:

- organization-scoped users and cases;
- a controlled synthetic parcel dataset;
- immutable fixture acquisition and observation records;
- parcel identity normalization;
- evidence-linked civic events and timeline assembly;
- completeness evaluation;
- one versioned deterministic policy rule;
- append-only human review decisions;
- immutable report versions and evidence manifests;
- cross-organization authorization tests;
- CI for tests, build, migrations, secret scanning, and production dependency auditing.

The first release excludes:

- live county crawling beyond a later separately approved shadow adapter;
- unrestricted owner-name search;
- automated legal conclusions or accusations;
- public adverse findings;
- billing;
- redaction, OCR, accessibility remediation, malware processing, and physical-mail execution;
- source-repository retirement;
- real sensitive records while this repository remains public.

## 3. Source repositories and responsibilities

| Repository | CivicLedger responsibility |
| --- | --- |
| `humboldt-records-watch` | Acquisition, immutable observations, source health, hashes, and change detection |
| `FairProcess` | Organization boundaries, roles, deterministic policies, review gates, and append-only audit concepts |
| `permitsignal` | Public-source extraction contracts, evidence excerpts, confidence, and opportunity intelligence |
| `ParcelProof` | Parcel investigation workspace, evidence categories, completeness, and report concepts |
| `code-sale-finder` | Neutral enforcement-to-transfer relationship analysis |
| `redact-desk` | Isolated, review-gated permanent-redaction worker in a later stage |
| `AccessForge` | Isolated accessibility audit and remediation worker in a later stage |
| `mailmypdf` | Optional downstream delivery after approval and verified payment in a later stage |
| `humboldt-digital-commons` | Governance, vocabulary, migration gates, and standards |

## 4. Product roles

### Public user

May inspect explicitly published parcel summaries, source dates, and released reports. Public access is not part of the first authenticated vertical slice.

### Professional user

May create organization-scoped cases, select controlled parcel records, inspect evidence, review timelines, request evaluation, and generate draft reports.

### Reviewer

May accept, reject, correct, defer, or supersede extractions and findings. Reviewer actions are attributed and append-only.

### Administrator

May configure organizations, users, approved sources, policy versions, retention classes, and system health. Administrative behavior is minimized in the first release.

These roles do not imply government authorization or endorsement.

## 5. Architecture

```text
civic-ledger/
  apps/
    web/                    # React user interface
    api/                    # Fastify application API
    worker/                 # queue consumers
    scheduler/              # recurring source jobs

  packages/
    auth/                   # actor context and organization authorization
    audit/                  # append-only audit contracts
    domain/                 # canonical civic entities
    evidence/               # provenance, hashes, citations, manifests
    parcel/                 # parcel identity and query normalization
    policy-engine/          # deterministic versioned rules
    reporting/              # report models and rendering contracts
    shared-ui/              # accessible application components
    test-support/           # fixtures, builders, and contract harnesses

  services/
    records-watch/          # acquisition and observation processing
    parcel-analysis/        # timeline and completeness assembly
    process-audit/          # policy evaluation and review queue

  infra/
    migrations/             # PostgreSQL migrations
    compose/                # local PostgreSQL and S3-compatible storage

  docs/
    architecture/
    migration/
    operations/
    product/
    superpowers/
```

### Runtime shape

The initial deployable system uses:

- Node.js 22;
- pnpm workspaces with an exact package-manager version;
- TypeScript in strict mode;
- React and Vite for `apps/web`;
- Fastify for `apps/api`;
- PostgreSQL for transactional, review, report, and audit data;
- S3-compatible object storage for source bytes and generated artifacts;
- a durable queue abstraction, initially exercised synchronously in tests;
- separate worker and scheduler entry points;
- OIDC authorization-code flow with PKCE before production authentication;
- local Compose for integration testing.

No document processor receives unrestricted database or object-storage privileges.

## 6. Canonical entities

- **Organization** — tenant and policy boundary.
- **User** — authenticated actor associated with organizations.
- **Agency** — public body or source authority.
- **Source** — approved website, portal, feed, file set, or manual source.
- **Acquisition** — one bounded retrieval attempt.
- **Document** — immutable logical document.
- **Observation** — time-specific content or metadata observation.
- **Parcel** — canonical parcel identity and jurisdiction identifiers.
- **Property** — physical location concept mapped to parcels over time.
- **Party** — person, business, agency, or other participant.
- **CivicEvent** — normalized event linked to evidence and time.
- **Case** — organization-scoped investigation container.
- **EvidenceItem** — claim-scoped reference to an observation.
- **PolicyRequirement** — deterministic versioned requirement.
- **Finding** — rule or reviewer evaluation with evidence and status.
- **ReviewDecision** — append-only human disposition.
- **Report** — immutable versioned output.
- **AuditEvent** — append-only material-action record.

Identifiers are UUIDs. All organization-owned rows include `organization_id`. Stored timestamps are UTC. Domain events use explicit schema versions.

## 7. Evidence invariants

1. Every factual report assertion references at least one evidence item.
2. Every evidence item resolves to a stored observation or explicitly identified authoritative external record.
3. Stored source bytes carry a SHA-256 hash and acquisition metadata.
4. Derived text retains page, section, selector, row, or equivalent location when available.
5. Reprocessing creates a new derivation and never overwrites historical evidence.
6. Entity matches retain method, score, normalized values, and review state.
7. A consequential finding cannot become approved solely from an AI response.
8. Released report versions are immutable; corrections create a superseding version.
9. Audit events identify actor, organization, action, target, timestamp, and correlation identifier.
10. The system distinguishes absence of evidence from evidence that an event did not occur.

## 8. Primary workflow

### Parcel selection

A professional user selects a parcel from a controlled dataset by APN or normalized address. Results include source and freshness metadata.

### Case creation

The user creates an organization-scoped case and attaches the selected parcel. Authorization is checked at the API and repository layers.

### Fixture acquisition

A deterministic adapter ingests a known fixture set. Each acquisition records source, state, response metadata, SHA-256, storage key, idempotency key, and correlation identifier. Duplicate input returns the original acquisition outcome.

### Normalization

The fixture extractor creates observations, evidence items, and civic events. Every event links to evidence. Ambiguous parcel or party matches remain reviewable candidates.

### Completeness evaluation

The parcel-analysis service reports evidence categories as:

- present;
- missing expected evidence;
- unavailable source;
- ambiguous match;
- stale observation;
- review required.

Completeness is an evidence assessment, not a legal conclusion.

### Process evaluation

A versioned deterministic rule evaluates approved event facts. Allowed outcomes are:

- satisfied;
- apparently unsatisfied;
- indeterminate;
- not applicable;
- review required.

Every result records the rule version, input facts, evidence references, limitations, and execution time.

### Human review

A reviewer may accept, reject, correct, defer, or supersede a finding. The prior decision remains visible and immutable.

### Report generation

The reporting service creates an immutable version containing:

- parcel identity summary;
- source inventory and freshness;
- chronological evidence-linked timeline;
- completeness matrix;
- process findings and limitations;
- unresolved questions;
- evidence manifest with hashes and locations;
- report version and approval metadata.

## 9. Authorization

Every non-public request carries an actor context containing:

- `userId`;
- `organizationId`;
- `roles`;
- `correlationId`.

Repositories require `organizationId` explicitly. They do not infer tenancy from client-supplied object identifiers. Cross-organization access returns `404` to avoid confirming resource existence. Reviewer actions require the `reviewer` or `administrator` role.

Production authentication will use OIDC authorization-code flow with PKCE. Development authentication may use signed deterministic test identities only outside production.

## 10. Audit model

Material actions emit append-only audit events:

- case creation and status changes;
- acquisition scheduling and completion;
- extraction and entity-match decisions;
- policy execution;
- review decisions;
- report generation and release;
- artifact access grants;
- administrative configuration changes.

Audit events are hash chained by organization and partition. Verification runs in tests and through an operational command.

## 11. Error handling and idempotency

Asynchronous commands include an idempotency key and correlation identifier.

Job states are:

- `queued`;
- `running`;
- `succeeded`;
- `retryable_failure`;
- `terminal_failure`;
- `awaiting_review`;
- `cancelled`.

Retries use bounded exponential backoff. Permanent failures retain partial evidence and explicit failure metadata. Missing sources never silently disappear from reports.

## 12. Security and privacy

The baseline requires:

- organization-scoped authorization on every non-public resource;
- least-privilege service credentials;
- encrypted transport and managed secrets;
- private object storage by default;
- signed short-lived artifact access;
- explicit file type and size validation;
- immutable audit records with integrity verification;
- retention classes by artifact type;
- secret scanning and production dependency auditing in CI;
- rate limits and bounded source policies;
- outbound-network restrictions for acquisition workers;
- no production default credentials;
- field minimization and publication review.

Because this repository is currently public, the first implementation contains only synthetic fixtures and public-safe documentation. No copied secrets, real case files, private records, or production configuration may be committed.

## 13. Testing strategy

### Unit tests

Cover domain validation, parcel normalization, evidence invariants, policy rules, completeness evaluation, report contracts, idempotency, and audit-chain verification.

### Contract tests

Every source adapter and worker passes shared contracts for acquisition metadata, evidence locations, error classification, duplicate input, organization isolation, and audit emission.

### Integration tests

A local stack validates PostgreSQL migrations, object storage, API repositories, and organization isolation. Migrations run up, down where supported, and up again.

### End-to-end test

A synthetic parcel case must:

1. authenticate as an organization user;
2. select one fixture parcel;
3. create a case;
4. ingest a known fixture set;
5. produce immutable observations;
6. create several evidence-linked civic events;
7. flag one intentionally missing procedural record;
8. run one deterministic policy rule;
9. require and record human review;
10. generate a versioned report and evidence manifest;
11. prove a second organization cannot access the case.

No end-to-end test depends on a live county website.

## 14. Migration stages

1. **Repository and governance** — charter, security policy, contribution rules, license decision, protected workflow, and migration inventory.
2. **Foundation** — monorepo, organization boundaries, audit, acquisition, evidence, parcel, and report contracts.
3. **First vertical slice** — controlled parcel case from fixture ingestion through reviewed report.
4. **Process integrity** — selected FairProcess rule sets and rule-version management.
5. **Commercial intelligence** — PermitSignal extraction and opportunity presentation on the shared evidence model.
6. **Document operations** — isolated RedactDesk, AccessForge, and later MailMyPDF delivery.
7. **Source retirement** — only after mapped behavior, tests, exports, documentation, release gates, and owner approval.

## 15. First-release acceptance criteria

The release is complete when:

1. A user can authenticate and create an organization-scoped case.
2. A user can select a parcel from a controlled dataset.
3. Fixture ingestion preserves provenance and is idempotent.
4. Every timeline event links to evidence.
5. Missing, ambiguous, stale, and unavailable evidence are distinguished.
6. One deterministic versioned process rule runs with evidence.
7. Human approval is required before a consequential finding can be released.
8. An immutable report version and evidence manifest are generated.
9. Cross-organization access tests pass.
10. CI passes tests, build, migrations, secret scanning, and production dependency auditing.
11. Existing civic repositories remain unchanged except through separately reviewed migration documentation.
12. The product makes no claim of government endorsement or legal determination.

## 16. Revenue sequence

Revenue uses the shared evidence foundation rather than separate codebases:

1. reviewed professional parcel reports;
2. permit and opportunity subscriptions;
3. monitoring and research workspaces;
4. document-operation fees;
5. governed agency or enterprise deployments.

Billing remains deferred until the first vertical slice proves trustworthy evidence handling and repeatable report production.
