export type ApiRole = "professional" | "reviewer" | "administrator";

export interface ApiActor {
  userId: string;
  organizationId: string;
  roles: readonly ApiRole[];
  correlationId: string;
}

export interface ApiRuntimeConfig {
  environment: "development" | "test" | "production";
  testIdentitySecret?: string;
  oidc?: {
    issuer: string;
    audience: string;
    jwksUri: string;
  };
}

export type ProductionAuthenticator = (
  authorization: string | undefined
) => Promise<ApiActor | null>;

export interface ApiServices {
  parcels: {
    search(input: { actor: ApiActor; apn: string }): Promise<readonly unknown[]>;
  };
  cases: {
    create(input: {
      actor: ApiActor;
      parcelId: string;
      title: string;
    }): Promise<unknown>;
    get(input: { actor: ApiActor; caseId: string }): Promise<unknown | null>;
  };
  acquisitions: {
    acquireFixture(input: {
      actor: ApiActor;
      caseId: string;
      fixtureDirectory: "fixtures/parcel-case-001";
      idempotencyKey: string;
    }): Promise<unknown>;
  };
  analysis: {
    get(input: { actor: ApiActor; caseId: string }): Promise<unknown | null>;
  };
  reviews: {
    record(input: {
      actor: ApiActor;
      findingId: string;
      disposition: "approved" | "rejected" | "corrected" | "deferred" | "superseded";
      rationale: string;
      supersedesDecisionId?: string;
    }): Promise<unknown>;
  };
  reports: {
    create(input: {
      actor: ApiActor;
      caseId: string;
      idempotencyKey: string;
    }): Promise<unknown>;
    get(input: { actor: ApiActor; reportId: string }): Promise<unknown | null>;
  };
}

export interface BuildAppOptions {
  services: ApiServices;
  config: ApiRuntimeConfig;
  authenticateProduction?: ProductionAuthenticator;
}
