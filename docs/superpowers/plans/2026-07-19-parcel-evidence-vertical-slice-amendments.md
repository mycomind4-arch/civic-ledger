# Parcel-to-Evidence Plan Amendments

## 2026-07-19 — TypeScript version correction

The implementation plan named `typescript@5.9.0`. The package registry returned `ERR_PNPM_NO_MATCHING_VERSION` because that version was never published. The stable published TypeScript version at validation time is `7.0.2`.

For every task and command in the parent plan, `typescript@7.0.2` governs. No behavioral requirement, domain contract, security invariant, or release gate is changed by this correction.

Evidence: GitHub Actions run `29705431880`, job `88241502137`, bootstrap diagnostics artifact `8447743896`.
