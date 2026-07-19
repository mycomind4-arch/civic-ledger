import { createHash } from "node:crypto";
import { FixtureSourceAdapter, UnsafeFixturePathError } from "./fixture-adapter.js";

export type AcquisitionState =
  | "succeeded"
  | "retryable_failure"
  | "terminal_failure";

export interface AcquisitionCommand {
  organizationId: string;
  actorId: string;
  sourceId: string;
  fixtureDirectory: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface AcquisitionResult {
  acquisitionId: string;
  state: AcquisitionState;
  documentCount: number;
  errorCode?: string;
}

export interface AcquisitionStore {
  findByIdempotency(input: {
    organizationId: string;
    sourceId: string;
    idempotencyKey: string;
  }): Promise<AcquisitionResult | null>;
  create(command: AcquisitionCommand): Promise<string>;
  complete(input: {
    acquisitionId: string;
    state: AcquisitionState;
    documentCount: number;
    errorCode?: string;
  }): Promise<void>;
}

export interface ImmutableRecordStore {
  createDocumentObservation(input: {
    organizationId: string;
    sourceId: string;
    acquisitionId: string;
    storageKey: string;
    sha256: string;
    mediaType: string;
    byteLength: number;
    observedAt: string;
    metadata: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}

export interface ObjectStore {
  putIfAbsent(key: string, bytes: Uint8Array): Promise<void>;
}

export interface AcquisitionAuditSink {
  emit(input: {
    organizationId: string;
    actorId: string;
    acquisitionId: string;
    action: string;
    correlationId: string;
    payload: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}

export interface AcquisitionDependencies {
  acquisitions: AcquisitionStore;
  records: ImmutableRecordStore;
  objects: ObjectStore;
  audit: AcquisitionAuditSink;
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function failureCode(error: unknown): { state: Exclude<AcquisitionState, "succeeded">; code: string } {
  if (error instanceof UnsafeFixturePathError) {
    return { state: "terminal_failure", code: error.code };
  }
  if (error instanceof SyntaxError) {
    return { state: "terminal_failure", code: "invalid_fixture_manifest" };
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "ENOENT" || code === "EISDIR") {
      return { state: "terminal_failure", code: "fixture_file_unavailable" };
    }
  }
  return { state: "retryable_failure", code: "fixture_acquisition_failed" };
}

export async function acquireFixtureSet(
  dependencies: AcquisitionDependencies,
  command: AcquisitionCommand
): Promise<AcquisitionResult> {
  const existing = await dependencies.acquisitions.findByIdempotency({
    organizationId: command.organizationId,
    sourceId: command.sourceId,
    idempotencyKey: command.idempotencyKey
  });
  if (existing) return existing;

  const acquisitionId = await dependencies.acquisitions.create(command);

  try {
    const fixture = await new FixtureSourceAdapter(command.fixtureDirectory).read();

    for (const document of fixture.documents) {
      const sha256 = digest(document.bytes);
      const storageKey = [
        "organizations",
        command.organizationId,
        "sources",
        command.sourceId,
        "sha256",
        sha256
      ].join("/");

      await dependencies.objects.putIfAbsent(storageKey, document.bytes);
      await dependencies.records.createDocumentObservation({
        organizationId: command.organizationId,
        sourceId: command.sourceId,
        acquisitionId,
        storageKey,
        sha256,
        mediaType: document.mediaType,
        byteLength: document.bytes.byteLength,
        observedAt: document.occurredAt,
        metadata: {
          fixtureId: fixture.manifest.fixtureId,
          sourceRelativePath: document.path,
          category: document.category,
          agency: fixture.manifest.agency,
          synthetic: true
        }
      });
    }

    const result: AcquisitionResult = {
      acquisitionId,
      state: "succeeded",
      documentCount: fixture.documents.length
    };
    await dependencies.acquisitions.complete(result);
    await dependencies.audit.emit({
      organizationId: command.organizationId,
      actorId: command.actorId,
      acquisitionId,
      action: "fixture.acquisition.succeeded",
      correlationId: command.correlationId,
      payload: { documentCount: fixture.documents.length, fixtureId: fixture.manifest.fixtureId }
    });
    return result;
  } catch (error) {
    const failure = failureCode(error);
    const result: AcquisitionResult = {
      acquisitionId,
      state: failure.state,
      documentCount: 0,
      errorCode: failure.code
    };
    await dependencies.acquisitions.complete(result);
    await dependencies.audit.emit({
      organizationId: command.organizationId,
      actorId: command.actorId,
      acquisitionId,
      action: `fixture.acquisition.${failure.state}`,
      correlationId: command.correlationId,
      payload: { errorCode: failure.code }
    });
    return result;
  }
}
