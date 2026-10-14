import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
};
