# CivicLedger

CivicLedger is a source-backed civic records, parcel, and procedural-integrity platform.

Its first complete workflow is:

> Search a parcel, preserve the known public records, construct an evidence-linked event timeline, identify missing or inconsistent procedural steps, require human review for consequential findings, and generate a versioned evidence report.

## Current status

This repository is in architecture and implementation-planning stage. Existing civic repositories remain intact and authoritative during migration.

## Product principles

- Every factual report assertion must link to evidence.
- Source observations and released report versions are immutable.
- Absence of evidence is not presented as evidence that an event did not occur.
- Consequential findings require human approval.
- CivicLedger is an independent initiative and does not claim government endorsement.
- The product does not make automated legal determinations.

## Source systems

CivicLedger will selectively adapt validated contracts and behavior from:

- `humboldt-records-watch`
- `FairProcess`
- `permitsignal`
- `ParcelProof`
- `code-sale-finder`
- `redact-desk`
- `AccessForge`
- `mailmypdf`
- `humboldt-digital-commons`

Source repositories will not be retired until replacement behavior, tests, provenance, exports, and operational documentation have been validated here.

## License

No license is granted yet. A licensing decision will be recorded before external reuse or distribution.
