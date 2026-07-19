import { createHash, randomUUID } from "node:crypto";

const GENESIS_HASH = "0".repeat(64);

export interface AuditEventInput {
  organizationId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  correlationId: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  previousHash: string;
  eventHash: string;
}

export interface AuditVerification {
  valid: boolean;
  invalidIndex?: number;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

function hashEvent(input: AuditEventInput, previousHash: string): string {
  const canonical = JSON.stringify(
    canonicalize({
      action: input.action,
      actorId: input.actorId,
      correlationId: input.correlationId,
      occurredAt: input.occurredAt,
      organizationId: input.organizationId,
      payload: input.payload,
      previousHash,
      targetId: input.targetId,
      targetType: input.targetType
    })
  );
  return createHash("sha256").update(canonical).digest("hex");
}

export function appendAuditEvent(
  chain: readonly AuditEvent[],
  input: AuditEventInput,
  id = randomUUID()
): readonly AuditEvent[] {
  const previousHash = chain.at(-1)?.eventHash ?? GENESIS_HASH;
  const event = Object.freeze({
    ...input,
    id,
    previousHash,
    eventHash: hashEvent(input, previousHash)
  });
  return Object.freeze([...chain, event]);
}

export function verifyAuditChain(chain: readonly AuditEvent[]): AuditVerification {
  let previousHash = GENESIS_HASH;

  for (const [index, event] of chain.entries()) {
    if (event.previousHash !== previousHash || hashEvent(event, previousHash) !== event.eventHash) {
      return { valid: false, invalidIndex: index };
    }
    previousHash = event.eventHash;
  }

  return { valid: true };
}
