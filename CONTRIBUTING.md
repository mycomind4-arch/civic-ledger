# Contributing to CivicLedger

## Change workflow

- Work on a branch; do not develop directly on `main`.
- Open a draft pull request before a change is treated as integration-ready.
- Write or update the relevant test before changing implementation behavior.
- Run the narrow test first, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before requesting review.
- Keep commits focused and explain evidence, authorization, migration, and compatibility effects in the pull request.

## Evidence and language rules

Every displayed civic event and every factual report assertion must reference evidence. Domain tests must include explicit evidence identifiers and limitation language. Absence of acquired evidence must never be represented as proof that an event or record did not exist.

Consequential findings require an append-only human review decision before release. Tests must prove that unreviewed findings cannot be released.

## Database changes

Migration files are immutable after merge. Corrections require a new migration. Development-only down migrations must preserve a reliable up/down/up validation cycle. Every organization-owned repository method must require `organizationId` explicitly, and cross-organization lookups must behave as not found.

## Public repository safety

Only synthetic fixtures are allowed. Never commit `.env` files, secrets, real case files, private records, production identifiers, database dumps, or object-storage data. Use deterministic fictional identities and UUIDs in tests.

## Source attribution

A migration pull request must identify the source repository, the source path or concept, and whether the implementation was copied, adapted, or independently reimplemented. Do not claim a source repository has been replaced until its behavior, tests, provenance, and operational limits are mapped and verified in CivicLedger.
