import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../types.js";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

export function registerCaseRoutes(app: FastifyInstance, services: ApiServices): void {
  app.post<{ Body: { parcelId: string; title: string } }>(
    "/v1/cases",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["parcelId", "title"],
          properties: {
            parcelId: { type: "string", pattern: UUID_PATTERN },
            title: { type: "string", minLength: 1, maxLength: 200 }
          }
        }
      }
    },
    async (request, reply) => {
      const result = await services.cases.create({
        actor: request.actor,
        parcelId: request.body.parcelId,
        title: request.body.title.trim()
      });
      return reply.code(201).send(result);
    }
  );

  app.get<{ Params: { caseId: string } }>(
    "/v1/cases/:caseId",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["caseId"],
          properties: { caseId: { type: "string", pattern: UUID_PATTERN } }
        }
      }
    },
    async (request, reply) => {
      const result = await services.cases.get({ actor: request.actor, caseId: request.params.caseId });
      if (!result) return reply.code(404).send({ error: "Not found" });
      return result;
    }
  );

  app.get<{ Params: { caseId: string } }>(
    "/v1/cases/:caseId/analysis",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["caseId"],
          properties: { caseId: { type: "string", pattern: UUID_PATTERN } }
        }
      }
    },
    async (request, reply) => {
      const result = await services.analysis.get({ actor: request.actor, caseId: request.params.caseId });
      if (!result) return reply.code(404).send({ error: "Not found" });
      return result;
    }
  );
}
