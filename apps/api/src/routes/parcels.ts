import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../types.js";

export function registerParcelRoutes(app: FastifyInstance, services: ApiServices): void {
  app.get<{ Querystring: { apn: string } }>(
    "/v1/parcels",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["apn"],
          properties: {
            apn: { type: "string", minLength: 6, maxLength: 32, pattern: "^[0-9A-Za-z -]+$" }
          }
        }
      }
    },
    async (request) => services.parcels.search({ actor: request.actor, apn: request.query.apn })
  );
}
