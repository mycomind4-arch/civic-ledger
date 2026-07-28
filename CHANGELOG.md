# Changelog

## 0.1.0 (2026-07-28)

Initial package release.

### Added
- TypeScript types for all 5 shared schemas: `AuditEvent`, `DocumentReference`, `NotificationPreference`, `Organization`, `ParcelReference`
- JSON Schema files (draft 2020-12) for runtime validation
- Schema registry with `$id` references
- FairProcess → Ruth integration contract (`fairProcessReportToCivicProblem`)
- Package configuration (`package.json`, `tsconfig.json`)
- 14 tests covering package structure, schema integrity, and contract exports
