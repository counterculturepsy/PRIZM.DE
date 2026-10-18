import { sql } from "drizzle-orm";
import type { SalesDraft, SalesEvidence } from "@/modules/ai/sales";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workspaceRole = pgEnum("workspace_role", [
  "owner",
  "admin",
  "sales",
  "developer",
  "viewer",
]);
export const workspaceStatus = pgEnum("workspace_status", ["active", "suspended", "deleting"]);
export const membershipStatus = pgEnum("membership_status", ["invited", "active", "suspended"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const dataConfidence = pgEnum("data_confidence", ["high", "medium", "low"]);
export const factKind = pgEnum("fact_kind", ["observed", "user_supplied", "inferred", "unknown"]);
export const discoveryRunStatus = pgEnum("discovery_run_status", ["running", "completed", "failed"]);
export const websiteAuditStatus = pgEnum("website_audit_status", ["queued", "running", "completed", "partial", "failed", "blocked"]);
export const auditJobStatus = pgEnum("audit_job_status", ["queued", "running", "completed", "failed"]);
export const auditPageStatus = pgEnum("audit_page_status", ["completed", "failed", "blocked"]);
export const auditFindingSeverity = pgEnum("audit_finding_severity", ["info", "low", "medium", "high"]);
export const auditFindingCategory = pgEnum("audit_finding_category", ["seo", "accessibility", "performance", "security", "mobile", "content", "technology"]);
export const leadPriority = pgEnum("lead_priority", ["low", "possible", "good", "high", "priority"]);
export const opportunityType = pgEnum("opportunity_type", [
  "website_improvement",
  "accessibility_remediation",
  "seo_improvement",
  "security_hardening",
  "performance_optimization",
  "mobile_experience",
]);
export const leadStatus = pgEnum("lead_status", ["new", "qualified", "unqualified", "converted", "archived"]);
export const dealStage = pgEnum("deal_stage", ["identified", "contacted", "discovery", "proposal", "negotiation", "won", "lost"]);
export const crmActivityType = pgEnum("crm_activity_type", [
  "lead_created",
  "stage_changed",
  "note_added",
  "contact_added",
  "task_created",
  "task_completed",
  "contact_suppressed",
]);
export const crmTaskStatus = pgEnum("crm_task_status", ["open", "completed", "cancelled"]);
export const contactChannel = pgEnum("contact_channel", ["email", "phone"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    jobTitle: text("job_title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    normalizedOrigin: text("normalized_origin").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("websites_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("websites_workspace_origin_unique").on(table.workspaceId, table.normalizedOrigin),
    index("websites_workspace_company_idx").on(table.workspaceId, table.companyId),
    foreignKey({
      columns: [table.workspaceId, table.companyId],
      foreignColumns: [companies.workspaceId, companies.id],
      name: "websites_workspace_company_fk",
    }).onDelete("cascade"),
  ],
);

export const websiteAudits = pgTable(
  "website_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: websiteAuditStatus("status").default("queued").notNull(),
    authorizationBasis: text("authorization_basis").notNull(),
    policyVersion: text("policy_version").default("single-page-v1").notNull(),
    scoringVersion: text("scoring_version").default("diagnostic-v1").notNull(),
    robotsAllowed: boolean("robots_allowed"),
    score: integer("score"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    unique("website_audits_workspace_id_unique").on(table.workspaceId, table.id),
    index("website_audits_workspace_status_idx").on(table.workspaceId, table.status, table.requestedAt),
    index("website_audits_workspace_website_idx").on(table.workspaceId, table.websiteId, table.requestedAt),
    foreignKey({
      columns: [table.workspaceId, table.websiteId],
      foreignColumns: [websites.workspaceId, websites.id],
      name: "website_audits_workspace_website_fk",
    }).onDelete("cascade"),
  ],
);

export const auditJobs = pgTable(
  "audit_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    status: auditJobStatus("status").default("queued").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    workerId: text("worker_id"),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("audit_jobs_workspace_audit_unique").on(table.workspaceId, table.auditId),
    index("audit_jobs_status_run_after_idx").on(table.status, table.runAfter),
    foreignKey({
      columns: [table.workspaceId, table.auditId],
      foreignColumns: [websiteAudits.workspaceId, websiteAudits.id],
      name: "audit_jobs_workspace_audit_fk",
    }).onDelete("cascade"),
  ],
);

export const auditPages = pgTable(
  "audit_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    status: auditPageStatus("status").notNull(),
    httpStatus: integer("http_status"),
    contentType: text("content_type"),
    responseBytes: integer("response_bytes"),
    durationMs: integer("duration_ms"),
    title: text("title"),
    errorCode: text("error_code"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("audit_pages_workspace_id_unique").on(table.workspaceId, table.id),
    index("audit_pages_workspace_audit_idx").on(table.workspaceId, table.auditId),
    foreignKey({
      columns: [table.workspaceId, table.auditId],
      foreignColumns: [websiteAudits.workspaceId, websiteAudits.id],
      name: "audit_pages_workspace_audit_fk",
    }).onDelete("cascade"),
  ],
);

export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => auditPages.id, { onDelete: "cascade" }),
    category: auditFindingCategory("category").notNull(),
    code: text("code").notNull(),
    severity: auditFindingSeverity("severity").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    evidence: text("evidence").notNull(),
    sourceUrl: text("source_url").notNull(),
    confidence: dataConfidence("confidence").default("high").notNull(),
    scoreImpact: integer("score_impact").default(0).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("audit_findings_workspace_audit_id_unique").on(table.workspaceId, table.auditId, table.id),
    uniqueIndex("audit_findings_workspace_audit_code_unique").on(table.workspaceId, table.auditId, table.code),
    index("audit_findings_workspace_audit_idx").on(table.workspaceId, table.auditId, table.severity),
    foreignKey({
      columns: [table.workspaceId, table.auditId],
      foreignColumns: [websiteAudits.workspaceId, websiteAudits.id],
      name: "audit_findings_workspace_audit_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.pageId],
      foreignColumns: [auditPages.workspaceId, auditPages.id],
      name: "audit_findings_workspace_page_fk",
    }).onDelete("cascade"),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: workspaceStatus("status").default("active").notNull(),
    timezone: text("timezone").default("Africa/Johannesburg").notNull(),
    currency: text("currency").default("ZAR").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)],
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRole("role").default("viewer").notNull(),
    status: invitationStatus("status").default("pending").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_invitations_token_hash_unique").on(table.tokenHash),
    index("workspace_invitations_workspace_status_idx").on(table.workspaceId, table.status),
    index("workspace_invitations_email_status_idx").on(table.email, table.status),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").default("").notNull(),
    startingPriceMinor: integer("starting_price_minor"),
    averagePriceMinor: integer("average_price_minor"),
    deliveryTimeDays: integer("delivery_time_days"),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("services_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("services_workspace_slug_unique").on(table.workspaceId, table.slug),
    index("services_workspace_active_idx").on(table.workspaceId, table.active),
  ],
);

export const idealCustomerProfiles = pgTable(
  "ideal_customer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").default("Primary ICP").notNull(),
    countries: jsonb("countries").$type<string[]>().default(["ZA"]).notNull(),
    provinces: jsonb("provinces").$type<string[]>().default([]).notNull(),
    cities: jsonb("cities").$type<string[]>().default([]).notNull(),
    industries: jsonb("industries").$type<string[]>().default([]).notNull(),
    companySizes: jsonb("company_sizes").$type<string[]>().default([]).notNull(),
    opportunityTypes: jsonb("opportunity_types").$type<string[]>().default([]).notNull(),
    excludedIndustries: jsonb("excluded_industries").$type<string[]>().default([]).notNull(),
    minimumBudgetMinor: integer("minimum_budget_minor"),
    maximumBudgetMinor: integer("maximum_budget_minor"),
    currency: text("currency").default("ZAR").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ideal_customer_profiles_workspace_name_unique").on(table.workspaceId, table.name),
  ],
);

export const onboardingProgress = pgTable("onboarding_progress", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").default(1).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").default("viewer").notNull(),
    status: membershipStatus("status").default("invited").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_status_idx").on(table.userId, table.status),
    index("workspace_members_workspace_role_idx").on(table.workspaceId, table.role),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    requestId: text("request_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("audit_logs_workspace_target_idx").on(table.workspaceId, table.targetType, table.targetId),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    description: text("description"),
    industry: text("industry"),
    employeeEstimate: integer("employee_estimate"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    postalCode: text("postal_code"),
    countryCode: text("country_code").default("ZA").notNull(),
    website: text("website"),
    domain: text("domain"),
    phone: text("phone"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),
    linkedinUrl: text("linkedin_url"),
    googleMapsUrl: text("google_maps_url"),
    ratingHundredths: integer("rating_hundredths"),
    reviewCount: integer("review_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("companies_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("companies_workspace_dedupe_unique").on(table.workspaceId, table.dedupeKey),
    index("companies_workspace_name_idx").on(table.workspaceId, table.name),
    index("companies_workspace_location_idx").on(table.workspaceId, table.province, table.city),
    index("companies_workspace_industry_idx").on(table.workspaceId, table.industry),
  ],
);

export const leadScores = pgTable(
  "lead_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    totalScore: integer("total_score").notNull(),
    priority: leadPriority("priority").notNull(),
    components: jsonb("components").$type<Array<{
      key: string;
      label: string;
      points: number;
      maxPoints: number;
      reason: string;
      evidenceFindingIds: string[];
    }>>().default([]).notNull(),
    scoringVersion: text("scoring_version").default("lead-v1").notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    sourceCompletedAt: timestamp("source_completed_at", { withTimezone: true }).notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lead_scores_workspace_audit_version_unique").on(table.workspaceId, table.auditId, table.scoringVersion),
    uniqueIndex("lead_scores_workspace_company_current_unique").on(table.workspaceId, table.companyId).where(sql`${table.isCurrent} = true`),
    index("lead_scores_workspace_priority_idx").on(table.workspaceId, table.priority, table.totalScore, table.calculatedAt),
    index("lead_scores_workspace_company_idx").on(table.workspaceId, table.companyId, table.calculatedAt),
    check("lead_scores_total_score_check", sql`${table.totalScore} between 0 and 100`),
    foreignKey({
      columns: [table.workspaceId, table.companyId],
      foreignColumns: [companies.workspaceId, companies.id],
      name: "lead_scores_workspace_company_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.auditId],
      foreignColumns: [websiteAudits.workspaceId, websiteAudits.id],
      name: "lead_scores_workspace_audit_fk",
    }).onDelete("cascade"),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id"),
    type: opportunityType("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    businessImpact: text("business_impact").notNull(),
    recommendedSolution: text("recommended_solution").notNull(),
    estimatedValueMinMinor: integer("estimated_value_min_minor"),
    estimatedValueMaxMinor: integer("estimated_value_max_minor"),
    currency: text("currency"),
    confidence: dataConfidence("confidence").default("medium").notNull(),
    generationVersion: text("generation_version").default("opportunity-v1").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("opportunities_workspace_audit_id_unique").on(table.workspaceId, table.auditId, table.id),
    unique("opportunities_workspace_company_id_unique").on(table.workspaceId, table.companyId, table.id),
    uniqueIndex("opportunities_workspace_audit_type_version_unique").on(table.workspaceId, table.auditId, table.type, table.generationVersion),
    index("opportunities_workspace_company_idx").on(table.workspaceId, table.companyId, table.createdAt),
    index("opportunities_workspace_type_idx").on(table.workspaceId, table.type, table.createdAt),
    check("opportunities_value_min_check", sql`${table.estimatedValueMinMinor} is null or ${table.estimatedValueMinMinor} >= 0`),
    check("opportunities_value_max_check", sql`${table.estimatedValueMaxMinor} is null or ${table.estimatedValueMaxMinor} >= 0`),
    check("opportunities_value_range_check", sql`${table.estimatedValueMinMinor} is null or ${table.estimatedValueMaxMinor} is null or ${table.estimatedValueMinMinor} <= ${table.estimatedValueMaxMinor}`),
    check("opportunities_currency_check", sql`(${table.estimatedValueMinMinor} is null and ${table.estimatedValueMaxMinor} is null and ${table.currency} is null) or (${table.currency} is not null and (${table.estimatedValueMinMinor} is not null or ${table.estimatedValueMaxMinor} is not null))`),
    foreignKey({
      columns: [table.workspaceId, table.companyId],
      foreignColumns: [companies.workspaceId, companies.id],
      name: "opportunities_workspace_company_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.auditId],
      foreignColumns: [websiteAudits.workspaceId, websiteAudits.id],
      name: "opportunities_workspace_audit_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.serviceId],
      foreignColumns: [services.workspaceId, services.id],
      name: "opportunities_workspace_service_fk",
    }).onDelete("restrict"),
  ],
);

export const opportunityEvidence = pgTable(
  "opportunity_evidence",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").notNull().references(() => websiteAudits.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").notNull(),
    findingId: uuid("finding_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.opportunityId, table.findingId] }),
    index("opportunity_evidence_workspace_audit_idx").on(table.workspaceId, table.auditId),
    foreignKey({
      columns: [table.workspaceId, table.auditId, table.opportunityId],
      foreignColumns: [opportunities.workspaceId, opportunities.auditId, opportunities.id],
      name: "opportunity_evidence_workspace_audit_opportunity_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.auditId, table.findingId],
      foreignColumns: [auditFindings.workspaceId, auditFindings.auditId, auditFindings.id],
      name: "opportunity_evidence_workspace_audit_finding_fk",
    }).onDelete("cascade"),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    sourceOpportunityId: uuid("source_opportunity_id"),
    ownerUserId: uuid("owner_user_id"),
    status: leadStatus("status").default("new").notNull(),
    title: text("title").notNull(),
    qualificationReason: text("qualification_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("leads_workspace_id_unique").on(table.workspaceId, table.id),
    unique("leads_workspace_company_id_unique").on(table.workspaceId, table.companyId, table.id),
    uniqueIndex("leads_workspace_company_unique").on(table.workspaceId, table.companyId),
    index("leads_workspace_status_idx").on(table.workspaceId, table.status, table.updatedAt),
    foreignKey({
      columns: [table.workspaceId, table.companyId],
      foreignColumns: [companies.workspaceId, companies.id],
      name: "leads_workspace_company_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.companyId, table.sourceOpportunityId],
      foreignColumns: [opportunities.workspaceId, opportunities.companyId, opportunities.id],
      name: "leads_workspace_company_opportunity_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.ownerUserId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
      name: "leads_workspace_owner_fk",
    }).onDelete("restrict"),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    roleTitle: text("role_title"),
    email: text("email"),
    normalizedEmail: text("normalized_email"),
    phone: text("phone"),
    normalizedPhone: text("normalized_phone"),
    sourceKind: factKind("source_kind").default("user_supplied").notNull(),
    sourceLabel: text("source_label").notNull(),
    sourceUrl: text("source_url"),
    confidence: dataConfidence("confidence").default("medium").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    doNotContact: boolean("do_not_contact").default(false).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("contacts_workspace_id_unique").on(table.workspaceId, table.id),
    index("contacts_workspace_company_idx").on(table.workspaceId, table.companyId, table.createdAt),
    uniqueIndex("contacts_workspace_company_email_unique").on(table.workspaceId, table.companyId, table.normalizedEmail).where(sql`${table.normalizedEmail} is not null`),
    uniqueIndex("contacts_workspace_company_phone_unique").on(table.workspaceId, table.companyId, table.normalizedPhone).where(sql`${table.normalizedPhone} is not null`),
    check("contacts_contact_method_check", sql`${table.normalizedEmail} is not null or ${table.normalizedPhone} is not null`),
    foreignKey({
      columns: [table.workspaceId, table.companyId],
      foreignColumns: [companies.workspaceId, companies.id],
      name: "contacts_workspace_company_fk",
    }).onDelete("cascade"),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull(),
    stage: dealStage("stage").default("identified").notNull(),
    valueMinor: integer("value_minor"),
    currency: text("currency").notNull(),
    expectedCloseAt: timestamp("expected_close_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("deals_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("deals_workspace_lead_unique").on(table.workspaceId, table.leadId),
    index("deals_workspace_stage_idx").on(table.workspaceId, table.stage, table.updatedAt),
    check("deals_value_check", sql`${table.valueMinor} is null or ${table.valueMinor} >= 0`),
    check("deals_currency_check", sql`char_length(${table.currency}) = 3`),
    foreignKey({
      columns: [table.workspaceId, table.leadId],
      foreignColumns: [leads.workspaceId, leads.id],
      name: "deals_workspace_lead_fk",
    }).onDelete("cascade"),
  ],
);

export const crmNotes = pgTable(
  "crm_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull(),
    authorUserId: uuid("author_user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("crm_notes_workspace_lead_idx").on(table.workspaceId, table.leadId, table.createdAt),
    check("crm_notes_body_check", sql`char_length(${table.body}) between 1 and 2000`),
    foreignKey({ columns: [table.workspaceId, table.leadId], foreignColumns: [leads.workspaceId, leads.id], name: "crm_notes_workspace_lead_fk" }).onDelete("cascade"),
    foreignKey({ columns: [table.workspaceId, table.authorUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "crm_notes_workspace_author_fk" }).onDelete("restrict"),
  ],
);

export const crmTasks = pgTable(
  "crm_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull(),
    assignedToUserId: uuid("assigned_to_user_id"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: crmTaskStatus("status").default("open").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("crm_tasks_workspace_id_unique").on(table.workspaceId, table.id),
    index("crm_tasks_workspace_status_due_idx").on(table.workspaceId, table.status, table.dueAt),
    index("crm_tasks_workspace_lead_idx").on(table.workspaceId, table.leadId, table.createdAt),
    check("crm_tasks_title_check", sql`char_length(${table.title}) between 1 and 160`),
    foreignKey({ columns: [table.workspaceId, table.leadId], foreignColumns: [leads.workspaceId, leads.id], name: "crm_tasks_workspace_lead_fk" }).onDelete("cascade"),
    foreignKey({ columns: [table.workspaceId, table.assignedToUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "crm_tasks_workspace_assignee_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.workspaceId, table.createdByUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "crm_tasks_workspace_creator_fk" }).onDelete("restrict"),
  ],
);

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull(),
    contactId: uuid("contact_id"),
    actorUserId: uuid("actor_user_id").notNull(),
    type: crmActivityType("type").notNull(),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("crm_activities_workspace_occurred_idx").on(table.workspaceId, table.occurredAt),
    index("crm_activities_workspace_lead_idx").on(table.workspaceId, table.leadId, table.occurredAt),
    check("crm_activities_summary_check", sql`char_length(${table.summary}) between 1 and 500`),
    foreignKey({ columns: [table.workspaceId, table.leadId], foreignColumns: [leads.workspaceId, leads.id], name: "crm_activities_workspace_lead_fk" }).onDelete("cascade"),
    foreignKey({ columns: [table.workspaceId, table.contactId], foreignColumns: [contacts.workspaceId, contacts.id], name: "crm_activities_workspace_contact_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.workspaceId, table.actorUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "crm_activities_workspace_actor_fk" }).onDelete("restrict"),
  ],
);

export const suppressionEntries = pgTable(
  "suppression_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id"),
    channel: contactChannel("channel").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    reason: text("reason").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("suppression_entries_workspace_channel_value_unique").on(table.workspaceId, table.channel, table.normalizedValue),
    index("suppression_entries_workspace_contact_idx").on(table.workspaceId, table.contactId),
    check("suppression_entries_reason_check", sql`char_length(${table.reason}) between 2 and 500`),
    foreignKey({ columns: [table.workspaceId, table.contactId], foreignColumns: [contacts.workspaceId, contacts.id], name: "suppression_entries_workspace_contact_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.workspaceId, table.createdByUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "suppression_entries_workspace_creator_fk" }).onDelete("restrict"),
  ],
);

export const companySources = pgTable(
  "company_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    sourceKey: text("source_key").notNull(),
    externalId: text("external_id"),
    sourceUrl: text("source_url"),
    confidence: dataConfidence("confidence").default("medium").notNull(),
    kind: factKind("kind").default("user_supplied").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, string | number | null>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_sources_workspace_source_unique").on(table.workspaceId, table.sourceKey),
    index("company_sources_workspace_company_idx").on(table.workspaceId, table.companyId),
    index("company_sources_workspace_provider_idx").on(table.workspaceId, table.provider),
  ],
);

export const discoveryRuns = pgTable(
  "discovery_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    status: discoveryRunStatus("status").default("running").notNull(),
    filters: jsonb("filters").$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
    resultCount: integer("result_count").default(0).notNull(),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("discovery_runs_workspace_started_idx").on(table.workspaceId, table.startedAt)],
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    filters: jsonb("filters").$type<{ q?: string; industry?: string; city?: string; province?: string }>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_searches_workspace_name_unique").on(table.workspaceId, table.name),
    index("saved_searches_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const aiWorkspacePolicies = pgTable("ai_workspace_policies", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(false).notNull(),
  dailyRequestLimit: integer("daily_request_limit").default(10).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("ai_policy_limit_check", sql`${table.dailyRequestLimit} between 1 and 100`)]);

export const aiDraftStatus = pgEnum("ai_draft_status", ["running", "completed", "failed"]);
export const aiReviewStatus = pgEnum("ai_review_status", ["pending", "approved", "rejected"]);
export const aiDraftPurpose = pgEnum("ai_draft_purpose", ["strategy", "outreach"]);
export const aiDraftRuns = pgTable("ai_draft_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  requestKey: uuid("request_key").notNull(),
  purpose: aiDraftPurpose("purpose").notNull(),
  status: aiDraftStatus("status").default("running").notNull(),
  reviewStatus: aiReviewStatus("review_status").default("pending").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  evidence: jsonb("evidence").$type<SalesEvidence[]>().notNull(),
  output: jsonb("output").$type<SalesDraft>(),
  errorCode: text("error_code"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  durationMs: integer("duration_ms"),
  reviewerUserId: uuid("reviewer_user_id"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("ai_runs_workspace_request_unique").on(table.workspaceId, table.requestKey),
  index("ai_runs_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("ai_runs_workspace_lead_idx").on(table.workspaceId, table.leadId),
  foreignKey({ columns: [table.workspaceId, table.leadId], foreignColumns: [leads.workspaceId, leads.id], name: "ai_runs_workspace_lead_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.workspaceId, table.actorUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "ai_runs_workspace_actor_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.workspaceId, table.reviewerUserId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "ai_runs_workspace_reviewer_fk" }).onDelete("restrict"),
  check("ai_runs_review_check", sql`(${table.reviewStatus} = 'pending' and ${table.reviewedAt} is null and ${table.reviewerUserId} is null) or (${table.status} = 'completed' and ${table.reviewedAt} is not null and ${table.reviewerUserId} is not null)`),
]);

export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  services,
  idealCustomerProfiles,
  onboardingProgress,
  auditLogs,
  companies,
  companySources,
  discoveryRuns,
  savedSearches,
  websites,
  websiteAudits,
  auditJobs,
  auditPages,
  auditFindings,
  leadScores,
  opportunities,
  opportunityEvidence,
  leads,
  contacts,
  deals,
  crmNotes,
  crmTasks,
  crmActivities,
  suppressionEntries,
  aiWorkspacePolicies,
  aiDraftRuns,
};
