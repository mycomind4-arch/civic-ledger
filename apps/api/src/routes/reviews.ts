import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../types.js";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

type ReviewBody = {
  disposition: "approved" | "rejected" | "corrected" | "deferred" | "superseded";
  rationale: string;
  supersedesDecisionId?: string;
};

export function registerReviewRoutes(app: FastifyInstance, services: ApiServices): void {
  app.post<{ Params: { findingId: string }; Body: ReviewBody }>(
    "/v1/findings/:findingId/reviews",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["findingId"],
          properties: { findingId: { type: "string", pattern: UUID_PATTERN } }
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["disposition", "rationale"],
          properties: {
            disposition: {
              type: "string",
              enum: ["approved", "rejected", "corrected", "deferred", "superseded"]
            },
            rationale: { type: "string", minLength: 1, maxLength: 2000 },
            supersedesDecisionId: { type: "string", pattern: UUID_PATTERN }
          }
        }
      }
    },
    async (request, reply) => {
      if (!request.actor.roles.includes("reviewer")) {
        return reply.code(403).send({ error: "Required role: reviewer" });
      }
      const result = await services.reviews.record({
        actor: request.actor,
        findingId: request.params.findingId,
        disposition: request.body.disposition,
        rationale: request.body.rationale.trim(),
        ...(request.body.supersedesDecisionId
          ? { supersedesDecisionId: request.body.supersedesDecisionId }
          : {})
      });
      return reply.code(201).send(result);
    }
  );
}
