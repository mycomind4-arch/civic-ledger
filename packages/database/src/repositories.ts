import type { CivicCase } from "@civic-ledger/domain";
import {
  assertUtcTimestamp,
  assertUuid,
  type CaseId,
  type OrganizationId,
  type ParcelId
} from "@civic-ledger/domain";
import type { QueryResultRow } from "pg";
import type { DatabasePool } from "./pool.js";

interface CaseRow extends QueryResultRow {
  id: string;
  organization_id: string;
  parcel_id: string;
  title: string;
  status: CivicCase["status"];
  created_at: Date;
}

function mapCase(row: CaseRow): CivicCase {
  return {
    id: assertUuid<"CaseId">(row.id) as CaseId,
    organizationId: assertUuid<"OrganizationId">(row.organization_id) as OrganizationId,
    parcelId: assertUuid<"ParcelId">(row.parcel_id) as ParcelId,
    title: row.title,
    status: row.status,
    createdAt: assertUtcTimestamp(row.created_at.toISOString())
  };
}

export interface CaseRepository {
  create(input: {
    organizationId: string;
    actorId: string;
    parcelId: string;
    title: string;
    correlationId: string;
  }): Promise<string>;
  findById(input: { organizationId: string; caseId: string }): Promise<CivicCase | null>;
}

export interface ObservationRepository {
  create(input: {
    organizationId: string;
    acquisitionId: string;
    documentId: string;
    observedAt: string;
    contentType: string;
    metadata: Readonly<Record<string, unknown>>;
  }): Promise<string>;
  findById(input: { organizationId: string; observationId: string }): Promise<Record<string, unknown> | null>;
  countForAcquisition(input: { organizationId: string; acquisitionId: string }): Promise<number>;
}

export interface EvidenceRepository {
  findById(input: { organizationId: string; evidenceItemId: string }): Promise<Record<string, unknown> | null>;
}

export interface FindingRepository {
  findById(input: { organizationId: string; findingId: string }): Promise<Record<string, unknown> | null>;
}

export interface ReviewRepository {
  listForFinding(input: { organizationId: string; findingId: string }): Promise<readonly Record<string, unknown>[]>;
}

export interface ReportRepository {
  findById(input: { organizationId: string; reportId: string }): Promise<Record<string, unknown> | null>;
}

export interface AuditRepository {
  listForTarget(input: {
    organizationId: string;
    targetType: string;
    targetId: string;
  }): Promise<readonly Record<string, unknown>[]>;
}

export interface Database {
  pool: DatabasePool;
  cases: CaseRepository;
  observations: ObservationRepository;
  evidence: EvidenceRepository;
  findings: FindingRepository;
  reviews: ReviewRepository;
  reports: ReportRepository;
  audit: AuditRepository;
}

async function tenantRow(
  pool: DatabasePool,
  sql: string,
  organizationId: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const result = await pool.query<Record<string, unknown> & QueryResultRow>(sql, [organizationId, id]);
  return result.rows[0] ?? null;
}

export function createRepositories(pool: DatabasePool): Database {
  const cases: CaseRepository = {
    async create(input) {
      const result = await pool.query<{ id: string } & QueryResultRow>(
        `INSERT INTO cases (
          organization_id, parcel_id, title, status, created_by, correlation_id
        ) VALUES ($1, $2, $3, 'open', $4, $5)
        RETURNING id`,
        [input.organizationId, input.parcelId, input.title, input.actorId, input.correlationId]
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error("Case insert did not return an ID");
      return id;
    },

    async findById({ organizationId, caseId }) {
      const result = await pool.query<CaseRow>(
        `SELECT id, organization_id, parcel_id, title, status, created_at
         FROM cases
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, caseId]
      );
      return result.rows[0] ? mapCase(result.rows[0]) : null;
    }
  };

  const observations: ObservationRepository = {
    async create(input) {
      const result = await pool.query<{ id: string } & QueryResultRow>(
        `INSERT INTO observations (
          organization_id, acquisition_id, document_id, observed_at, content_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id`,
        [
          input.organizationId,
          input.acquisitionId,
          input.documentId,
          input.observedAt,
          input.contentType,
          JSON.stringify(input.metadata)
        ]
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error("Observation insert did not return an ID");
      return id;
    },

    findById({ organizationId, observationId }) {
      return tenantRow(
        pool,
        `SELECT * FROM observations
         WHERE organization_id = $1 AND id = $2`,
        organizationId,
        observationId
      );
    },

    async countForAcquisition({ organizationId, acquisitionId }) {
      const result = await pool.query<{ count: string } & QueryResultRow>(
        `SELECT count(*)::text AS count FROM observations
         WHERE organization_id = $1 AND acquisition_id = $2`,
        [organizationId, acquisitionId]
      );
      return Number(result.rows[0]?.count ?? 0);
    }
  };

  return {
    pool,
    cases,
    observations,
    evidence: {
      findById: ({ organizationId, evidenceItemId }) =>
        tenantRow(
          pool,
          `SELECT * FROM evidence_items
           WHERE organization_id = $1 AND id = $2`,
          organizationId,
          evidenceItemId
        )
    },
    findings: {
      findById: ({ organizationId, findingId }) =>
        tenantRow(
          pool,
          `SELECT * FROM findings
           WHERE organization_id = $1 AND id = $2`,
          organizationId,
          findingId
        )
    },
    reviews: {
      async listForFinding({ organizationId, findingId }) {
        const result = await pool.query<Record<string, unknown> & QueryResultRow>(
          `SELECT * FROM review_decisions
           WHERE organization_id = $1 AND finding_id = $2
           ORDER BY occurred_at, id`,
          [organizationId, findingId]
        );
        return result.rows;
      }
    },
    reports: {
      findById: ({ organizationId, reportId }) =>
        tenantRow(
          pool,
          `SELECT * FROM reports
           WHERE organization_id = $1 AND id = $2`,
          organizationId,
          reportId
        )
    },
    audit: {
      async listForTarget({ organizationId, targetType, targetId }) {
        const result = await pool.query<Record<string, unknown> & QueryResultRow>(
          `SELECT * FROM audit_events
           WHERE organization_id = $1 AND target_type = $2 AND target_id = $3
           ORDER BY occurred_at, id`,
          [organizationId, targetType, targetId]
        );
        return result.rows;
      }
    }
  };
}
