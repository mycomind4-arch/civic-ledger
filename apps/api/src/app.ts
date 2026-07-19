import Fastify, { type FastifyInstance } from "fastify";
import { registerActorPlugin } from "./plugins/actor.js";
import { registerAcquisitionRoutes } from "./routes/acquisitions.js";
import { registerCaseRoutes } from "./routes/cases.js";
import { registerParcelRoutes } from "./routes/parcels.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerReviewRoutes } from "./routes/reviews.js";
import type { BuildAppOptions } from "./types.js";

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } }
  });
  registerActorPlugin(app, options.config, options.authenticateProduction);
  registerParcelRoutes(app, options.services);
  registerCaseRoutes(app, options.services);
  registerAcquisitionRoutes(app, options.services);
  registerReviewRoutes(app, options.services);
  registerReportRoutes(app, options.services);
  return app;
}
