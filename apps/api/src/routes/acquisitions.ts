import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../types.js";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

export function registerAcquisitionRoutes(app: FastifyInstance, services: ApiServices): void {
  app.post<{
    Params: { caseId: string };
    Headers: { "idempotency-key": string };
    Body: { fixtureDirectory: "fixtures/parcel-case-001" };
  }>(
    "/v1/cases/:caseId/acquisitions/fixture",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["caseId"],
          properties: { caseId: { type: "string", pattern: UUID_PATTERN } }
        },
        headers: {
          type: "object",
          required: ["idempotency-key"],
          properties: { "idempotency-key": { type: "string", minLength: 1, maxLength: 200 } }
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["fixtureDirectory"],
          properties: {
            fixtureDirectory: { type: "string", enum: ["fixtures/parcel-case-001"] }
          }
        }
      }
    },
    async (request, reply) => {
      const result = await services.acquisitions.acquireFixture({
        actor: request.actor,
        caseId: request.params.caseId,
        fixtureDirectory: request.body.fixtureDirectory,
        idempotencyKey: request.headers["idempotency-key"]
      });
      return reply.code(202).send(result);
    }
  );
}
