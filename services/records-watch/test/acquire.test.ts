import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireFixtureSet,
  type AcquisitionCommand,
  type AcquisitionDependencies,
  type AcquisitionResult
} from "../src/index.js";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_A = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "77777777-7777-4777-8777-777777777777";
const CORRELATION_ID = "44444444-4444-4444-8444-444444444444";
const TEMP_ROOT = resolve(process.cwd(), ".tmp", "records-watch-test");

interface MemoryHarness {
  dependencies: AcquisitionDependencies;
  results: Map<string, AcquisitionResult>;
  observations: Array<{ acquisitionId: string; storageKey: string }>;
  objects: Map<string, Uint8Array>;
  audits: string[];
}

function harness(): MemoryHarness {
  const results = new Map<string, AcquisitionResult>();
  const observations: Array<{ acquisitionId: string; storageKey: string }> = [];
  const objects = new Map<string, Uint8Array>();
  const audits: string[] = [];
  const keyFor = (input: { organizationId: string; sourceId: string; idempotencyKey: string }) =>
    `${input.organizationId}:${input.sourceId}:${input.idempotencyKey}`;
  const acquisitionKeys = new Map<string, string>();

  const dependencies: AcquisitionDependencies = {
    acquisitions: {
      async findByIdempotency(input) {
        const acquisitionId = acquisitionKeys.get(keyFor(input));
        return acquisitionId ? results.get(acquisitionId) ?? null : null;
      },
      async create(command) {
        const acquisitionId = randomUUID();
        acquisitionKeys.set(keyFor(command), acquisitionId);
        results.set(acquisitionId, {
          acquisitionId,
          state: "retryable_failure",
          documentCount: 0,
          errorCode: "in_progress"
        });
        return acquisitionId;
      },
      async complete(result) {
        results.set(result.acquisitionId, result);
      }
    },
    records: {
      async createDocumentObservation(input) {
        observations.push({
          acquisitionId: input.acquisitionId,
          storageKey: input.storageKey
        });
      }
    },
    objects: {
      async putIfAbsent(key, bytes) {
        if (!objects.has(key)) objects.set(key, bytes);
      }
    },
    audit: {
      async emit(input) {
        audits.push(input.action);
      }
    }
  };

  return { dependencies, results, observations, objects, audits };
}

function command(fixtureDirectory = "fixtures/parcel-case-001"): AcquisitionCommand {
  return {
    organizationId: ORG_A,
    actorId: USER_A,
    sourceId: SOURCE_ID,
    fixtureDirectory,
    idempotencyKey: "parcel-case-001-v1",
    correlationId: CORRELATION_ID
  };
}

afterEach(async () => {
  await rm(TEMP_ROOT, { recursive: true, force: true });
});

describe("synthetic fixture acquisition", () => {
  it("does not create duplicate observations for the same idempotency key", async () => {
    const memory = harness();
    const first = await acquireFixtureSet(memory.dependencies, command());
    const second = await acquireFixtureSet(memory.dependencies, command());

    expect(first.state).toBe("succeeded");
    expect(second.acquisitionId).toBe(first.acquisitionId);
    expect(
      memory.observations.filter(({ acquisitionId }) => acquisitionId === first.acquisitionId)
    ).toHaveLength(3);
    expect(memory.objects.size).toBe(3);
    expect(memory.audits).toEqual(["fixture.acquisition.succeeded"]);
  });

  it("rejects traversal declared by a manifest", async () => {
    const root = resolve(TEMP_ROOT, "fixture");
    await mkdir(root, { recursive: true });
    await writeFile(resolve(TEMP_ROOT, "outside.txt"), "must not be read");
    await writeFile(
      resolve(root, "manifest.json"),
      JSON.stringify({
        schemaVersion: "civic-ledger.fixture-manifest.v1",
        fixtureId: "unsafe-fixture",
        synthetic: true,
        agency: "Synthetic agency",
        expectedCategories: ["notice"],
        documents: [
          {
            path: "../outside.txt",
            category: "notice",
            mediaType: "text/plain",
            occurredAt: "2026-01-05T17:00:00.000Z"
          }
        ]
      })
    );

    const memory = harness();
    const result = await acquireFixtureSet(
      memory.dependencies,
      command(".tmp/records-watch-test/fixture")
    );

    expect(result).toMatchObject({ state: "terminal_failure", errorCode: "unsafe_fixture_path" });
    expect(memory.observations).toHaveLength(0);
    expect(memory.objects.size).toBe(0);
  });
});
