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
