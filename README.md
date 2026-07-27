# CivicLedger

CivicLedger is a shared contracts and coordination layer for the Humboldt civic-tech ecosystem.

It provides the type definitions, API contracts, and integration patterns that connect the independent civic products into a coherent system through [CivicLedger Hub](https://github.com/mycomind4-arch/civic-ledger-hub).

## Design decision

CivicLedger was originally planned as a monolithic consolidation of multiple civic repos. After review, we determined that the individual products work well independently and CivicLedger Hub already provides the unified user surface. Consolidation would be high-effort with diminishing returns.

**Instead, CivicLedger serves as:**

- A shared type library (case models, evidence types, records schemas)
- A contracts reference for inter-product API communication
- A coordination document for the ecosystem architecture
- A provenance and governance reference

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

## Product principles

- Every factual report assertion must link to evidence.
- Source observations and released report versions are immutable.
- Absence of evidence is not presented as evidence that an event did not occur.
- Consequential findings require human approval.
- CivicLedger is an independent initiative and does not claim government endorsement.
- The product does not make automated legal determinations.

## Revenue priorities

1. **AccessForge** — WCAG compliance is legally required for government and education. Closest to revenue.
2. **PermitSignal** — Contractors pay for structured permit/bid alerts. Revenue-first design.
3. **FairProcess** — Civic moonshot. Needs a pilot partner to move forward.

## Integration contracts

### FairProcess → Ruthless Problem Solver

[`contracts/fairprocess-ruth.ts`](contracts/fairprocess-ruth.ts) defines the
shared types and transformation function for converting FairProcess integrity
report findings into Ruth problem solver inputs.

**Flow:**

1. FairProcess audits a code-enforcement case and generates an `IntegrityReport`
2. The `fairProcessReportToCivicProblem()` function transforms findings into a
   `CivicProblemInput` with evidence-linked root causes
3. Ruth ingests the problem and generates solutions, execution plans, and monitoring
4. Each root cause carries a `CivicEvidenceLink` back to the FairProcess source document

**Principles enforced by the contract:**

- Every root cause links to FairProcess evidence (document hash + page reference)
- "Not located" findings are process gaps, not proof of misconduct
- Human approval required before consequential automation
- Priority and impact scores derive from finding severity, not AI guessing

## License

No license is granted yet. A licensing decision will be recorded before external reuse or distribution.
