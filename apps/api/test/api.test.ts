import { testIdentityHeaders } from "@civic-ledger/test-support";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/index.js";
import type { ApiActor, ApiServices } from "../src/types.js";

const SECRET = "synthetic-test-secret-at-least-16";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CASE_ID = "11111111-1111-4111-8111-111111111111";
const FINDING_ID = "22222222-2222-4222-8222-222222222222";
const apps: ReturnType<typeof buildApp>[] = [];

function actor(organizationId = ORG_A, roles: ApiActor["roles"] = ["professional"]): ApiActor {
  return {
    userId: "33333333-3333-4333-8333-333333333333",
    organizationId,
    roles,
    correlationId: "44444444-4444-4444-8444-444444444444"
  };
}

function services(): ApiServices {
  return {
    parcels: {
      async search({ apn }) {
        return [{ id: "55555555-5555-4555-8555-555555555555", apn }];
      }
    },
    cases: {
      async create({ actor: requestActor, parcelId, title }) {
        return { id: CASE_ID, organizationId: requestActor.organizationId, parcelId, title };
      },
      async get({ actor: requestActor, caseId }) {
        return requestActor.organizationId === ORG_A && caseId === CASE_ID
          ? { id: CASE_ID, organizationId: ORG_A }
          : null;
      }
    },
    acquisitions: {
      async acquireFixture({ idempotencyKey }) {
        return { acquisitionId: "66666666-6666-4666-8666-666666666666", idempotencyKey };
      }
    },
    analysis: {
      async get({ actor: requestActor, caseId }) {
        return requestActor.organizationId === ORG_A && caseId === CASE_ID
          ? { caseId, timeline: [] }
          : null;
      }
    },
    reviews: {
      async record({ findingId, disposition }) {
        return { id: "77777777-7777-4777-8777-777777777777", findingId, disposition };
      }
    },
    reports: {
      async create({ caseId, idempotencyKey }) {
        return { id: "88888888-8888-4888-8888-888888888888", caseId, idempotencyKey };
      },
      async get({ actor: requestActor, reportId }) {
        return requestActor.organizationId === ORG_A
          ? { id: reportId, organizationId: ORG_A }
          : null;
      }
    }
  };
}

function app() {
  const instance = buildApp({
    services: services(),
    config: { environment: "test", testIdentitySecret: SECRET }
  });
  apps.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((instance) => instance.close()));
});

describe("parcel evidence API", () => {
  it("returns 404 for another organization's case", async () => {
    const response = await app().inject({
      method: "GET",
      url: `/v1/cases/${CASE_ID}`,
      headers: testIdentityHeaders(actor(ORG_B), SECRET)
    });
    expect(response.statusCode).toBe(404);
  });

  it("requires reviewer role for finding approval", async () => {
    const response = await app().inject({
      method: "POST",
      url: `/v1/findings/${FINDING_ID}/reviews`,
      headers: testIdentityHeaders(actor(ORG_A, ["professional"]), SECRET),
      payload: { disposition: "approved", rationale: "Checked" }
    });
    expect(response.statusCode).toBe(403);
  });

  it("accepts a signed reviewer identity", async () => {
    const response = await app().inject({
      method: "POST",
      url: `/v1/findings/${FINDING_ID}/reviews`,
      headers: testIdentityHeaders(actor(ORG_A, ["reviewer"]), SECRET),
      payload: { disposition: "approved", rationale: "Synthetic evidence checked" }
    });
    expect(response.statusCode).toBe(201);
  });

  it("rejects tampered test identity envelopes", async () => {
    const headers = testIdentityHeaders(actor(), SECRET);
    headers["x-civic-test-signature"] = "0".repeat(64);
    const response = await app().inject({
      method: "GET",
      url: "/v1/parcels?apn=123-456-007-000",
      headers
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects malformed UUIDs and unknown body fields", async () => {
    const headers = testIdentityHeaders(actor(), SECRET);
    const malformed = await app().inject({
      method: "GET",
      url: "/v1/cases/not-a-uuid",
      headers
    });
    expect(malformed.statusCode).toBe(400);

    const unknown = await app().inject({
      method: "POST",
      url: "/v1/cases",
      headers,
      payload: {
        parcelId: "55555555-5555-4555-8555-555555555555",
        title: "Synthetic case",
        organizationId: ORG_B
      }
    });
    expect(unknown.statusCode).toBe(400);
  });

  it("requires idempotency keys for fixture acquisition and reports", async () => {
    const headers = testIdentityHeaders(actor(), SECRET);
    const acquisition = await app().inject({
      method: "POST",
      url: `/v1/cases/${CASE_ID}/acquisitions/fixture`,
      headers,
      payload: { fixtureDirectory: "fixtures/parcel-case-001" }
    });
    expect(acquisition.statusCode).toBe(400);

    const report = await app().inject({
      method: "POST",
      url: `/v1/cases/${CASE_ID}/reports`,
      headers,
      payload: {}
    });
    expect(report.statusCode).toBe(400);
  });

  it("fails closed when production OIDC configuration is incomplete", () => {
    expect(() =>
      buildApp({ services: services(), config: { environment: "production" } })
    ).toThrow("OIDC");
  });
});
