# Security Policy

## Public repository boundary

This repository is public. Only synthetic fixtures and public-safe documentation may be committed. Do not commit real case records, private correspondence, restricted public-record exports, credentials, API keys, tokens, cookies, database dumps, object-storage files, or production configuration.

Do not copy `.env` files into this repository. Examples must use non-secret placeholders and must never resemble usable credentials.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub Security Advisories for this repository. Do not open a public issue containing exploit details, credentials, personal information, or affected records.

If a credential may have been exposed, revoke or rotate it immediately before investigating repository history. Removing a secret from the latest commit is not sufficient.

## Production gate

CivicLedger must not be deployed with real records until all of the following are implemented and independently verified:

- OIDC authorization-code flow with PKCE and production issuer, audience, and JWKS validation;
- organization-scoped authorization for every non-public resource, including `404` responses for cross-organization lookups;
- private object storage with least-privilege service credentials and short-lived signed access;
- retention, export, correction, and deletion procedures appropriate to each artifact class;
- immutable audit evidence and reviewer approval for consequential findings;
- secret scanning, production dependency auditing, migration validation, and authorization tests in CI.

## Supported scope

Security fixes are accepted against the default branch and active release branches. The project currently has no production release and no security-support promise for experimental branches.
