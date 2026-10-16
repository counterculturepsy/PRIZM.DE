import {
  boolean,
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
};
