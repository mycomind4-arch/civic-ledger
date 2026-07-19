import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  ApiActor,
  ApiRole,
  ApiRuntimeConfig,
  ProductionAuthenticator
} from "../types.js";

declare module "fastify" {
  interface FastifyRequest {
    actor: ApiActor;
  }
}

const ROLES = new Set<ApiRole>(["professional", "reviewer", "administrator"]);

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function decodeTestActor(
  request: FastifyRequest,
  secret: string
): ApiActor | null {
  const encoded = headerValue(request.headers["x-civic-test-identity"]);
  const suppliedSignature = headerValue(request.headers["x-civic-test-signature"]);
  if (!encoded || !suppliedSignature || !/^[0-9a-f]{64}$/u.test(suppliedSignature)) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(encoded).digest();
  const supplied = Buffer.from(suppliedSignature, "hex");
  if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ApiActor>;
    if (
      typeof value.userId !== "string" ||
      typeof value.organizationId !== "string" ||
      typeof value.correlationId !== "string" ||
      !Array.isArray(value.roles) ||
      !value.roles.every((role) => typeof role === "string" && ROLES.has(role as ApiRole))
    ) {
      return null;
    }
    return {
      userId: value.userId,
      organizationId: value.organizationId,
      correlationId: value.correlationId,
      roles: value.roles as ApiRole[]
    };
  } catch {
    return null;
  }
}

export function validateRuntimeConfig(
  config: ApiRuntimeConfig,
  authenticateProduction?: ProductionAuthenticator
): void {
  if (config.environment === "production") {
    if (
      !config.oidc?.issuer ||
      !config.oidc.audience ||
      !config.oidc.jwksUri ||
      !authenticateProduction
    ) {
      throw new Error(
        "Production requires OIDC issuer, audience, JWKS URI, and a production authenticator"
      );
    }
    return;
  }

  if (!config.testIdentitySecret || config.testIdentitySecret.length < 16) {
    throw new Error("Non-production test identity signing secret must be at least 16 characters");
  }
}

export function registerActorPlugin(
  app: FastifyInstance,
  config: ApiRuntimeConfig,
  authenticateProduction?: ProductionAuthenticator
): void {
  validateRuntimeConfig(config, authenticateProduction);
  app.decorateRequest("actor");

  app.addHook("preHandler", async (request, reply) => {
    const actor =
      config.environment === "production"
        ? await authenticateProduction?.(headerValue(request.headers.authorization))
        : decodeTestActor(request, config.testIdentitySecret!);

    if (!actor) {
      await reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    request.actor = actor;
  });
}
