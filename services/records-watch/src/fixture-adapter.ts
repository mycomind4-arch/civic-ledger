import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export interface FixtureManifestDocument {
  path: string;
  category: string;
  mediaType: string;
  occurredAt: string;
}

export interface FixtureManifest {
  schemaVersion: "civic-ledger.fixture-manifest.v1";
  fixtureId: string;
  synthetic: true;
  agency: string;
  expectedCategories: readonly string[];
  documents: readonly FixtureManifestDocument[];
}

export interface FixtureDocument extends FixtureManifestDocument {
  bytes: Uint8Array;
}

export interface FixtureSet {
  manifest: FixtureManifest;
  documents: readonly FixtureDocument[];
}

export class UnsafeFixturePathError extends Error {
  readonly code = "unsafe_fixture_path";
}

function validateManifest(value: unknown): FixtureManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid fixture manifest");
  const manifest = value as Partial<FixtureManifest>;
  if (
    manifest.schemaVersion !== "civic-ledger.fixture-manifest.v1" ||
    manifest.synthetic !== true ||
    typeof manifest.fixtureId !== "string" ||
    typeof manifest.agency !== "string" ||
    !Array.isArray(manifest.expectedCategories) ||
    !Array.isArray(manifest.documents)
  ) {
    throw new Error("Invalid fixture manifest");
  }

  for (const document of manifest.documents) {
    if (
      !document ||
      typeof document.path !== "string" ||
      typeof document.category !== "string" ||
      typeof document.mediaType !== "string" ||
      typeof document.occurredAt !== "string"
    ) {
      throw new Error("Invalid fixture manifest document");
    }
  }

  return manifest as FixtureManifest;
}

function assertSafeDeclaredPath(path: string): void {
  if (isAbsolute(path)) throw new UnsafeFixturePathError("Absolute fixture paths are forbidden");
  const segments = path.split(/[\\/]/u);
  if (segments.some((segment) => segment === ".." || segment === "")) {
    throw new UnsafeFixturePathError("Fixture path traversal is forbidden");
  }
}

function isOutside(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot);
}

export class FixtureSourceAdapter {
  constructor(private readonly fixtureDirectory: string) {}

  async read(): Promise<FixtureSet> {
    if (isAbsolute(this.fixtureDirectory)) {
      throw new UnsafeFixturePathError("Absolute fixture directories are forbidden");
    }

    const root = await realpath(resolve(process.cwd(), this.fixtureDirectory));
    if (isOutside(process.cwd(), root)) {
      throw new UnsafeFixturePathError("Fixture directory must remain inside the repository");
    }

    const manifest = validateManifest(
      JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"))
    );
    const documents: FixtureDocument[] = [];

    for (const declaration of manifest.documents) {
      assertSafeDeclaredPath(declaration.path);
      const candidate = await realpath(resolve(root, declaration.path));
      if (isOutside(root, candidate)) {
        throw new UnsafeFixturePathError("Fixture document escapes its declared directory");
      }
      documents.push({ ...declaration, bytes: await readFile(candidate) });
    }

    return { manifest, documents: Object.freeze(documents) };
  }
}
