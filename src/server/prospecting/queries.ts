import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { getDatabase } from "@/server/db";
import { companies, companySources, savedSearches } from "@/server/db/schema";
import { tenantWhere } from "@/server/db/tenant";

export type CompanyFilters = Readonly<{ q?: string; industry?: string; city?: string; province?: string }>;

export function listCompanies(scope: WorkspaceScope, filters: CompanyFilters = {}) {
  const conditions = [tenantWhere(companies.workspaceId, scope)];
  if (filters.q) conditions.push(or(ilike(companies.name, `%${filters.q}%`), ilike(companies.domain, `%${filters.q}%`))!);
  if (filters.industry) conditions.push(eq(companies.industry, filters.industry));
  if (filters.city) conditions.push(eq(companies.city, filters.city));
  if (filters.province) conditions.push(eq(companies.province, filters.province));
  return getDatabase().select().from(companies).where(and(...conditions)).orderBy(asc(companies.name)).limit(100);
}

export async function getCompany(scope: WorkspaceScope, companyId: string) {
  const [company] = await getDatabase().select().from(companies).where(and(
    tenantWhere(companies.workspaceId, scope),
    eq(companies.id, companyId),
  )).limit(1);
  if (!company) return null;
  const sources = await getDatabase().select().from(companySources).where(and(
    tenantWhere(companySources.workspaceId, scope),
    eq(companySources.companyId, company.id),
  )).orderBy(desc(companySources.observedAt));
  return { company, sources } as const;
}

export async function getCompanyFilterOptions(scope: WorkspaceScope) {
  const rows = await getDatabase().select({
    industry: companies.industry,
    city: companies.city,
    province: companies.province,
  }).from(companies).where(tenantWhere(companies.workspaceId, scope)).groupBy(companies.industry, companies.city, companies.province);
  const unique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return { industries: unique(rows.map((row) => row.industry)), cities: unique(rows.map((row) => row.city)), provinces: unique(rows.map((row) => row.province)) };
}

export function listSavedSearches(scope: WorkspaceScope) {
  return getDatabase().select().from(savedSearches).where(tenantWhere(savedSearches.workspaceId, scope)).orderBy(desc(savedSearches.createdAt));
}

export async function countCompanies(scope: WorkspaceScope): Promise<number> {
  const [result] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(companies).where(tenantWhere(companies.workspaceId, scope));
  return result?.count ?? 0;
}
