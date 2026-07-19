import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../types.js";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

export function registerReportRoutes(app: FastifyInstance, services: ApiServices): void {
  app.post<{
    Params: { caseId: string };
    Headers: { "idempotency-key": string };
    Body: Record<string, never>;
  }>(
    "/v1/cases/:caseId/reports",
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
        body: { type: "object", additionalProperties: false }
      }
    },
    async (request, reply) => {
      const result = await services.reports.create({
        actor: request.actor,
        caseId: request.params.caseId,
        idempotencyKey: request.headers["idempotency-key"]
      });
      return reply.code(201).send(result);
    }
  );

  app.get<{ Params: { reportId: string } }>(
    "/v1/reports/:reportId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["reportId"],
          properties: { reportId: { type: "string", pattern: UUID_PATTERN } }
        }
      }
    },
    async (request, reply) => {
      const result = await services.reports.get({
        actor: request.actor,
        reportId: request.params.reportId
      });
      if (!result) return reply.code(404).send({ error: "Not found" });
      return result;
    }
  );
}
