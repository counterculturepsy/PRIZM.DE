import { and, eq } from "drizzle-orm";
import type { WorkspaceScope } from "@/modules/workspaces/scope";
import { companyDedupeKey, companySourceKey, parseCompanyCsv } from "@/modules/prospecting/csv";
import { getDatabase } from "@/server/db";
import { auditLogs, companies, companySources, discoveryRuns } from "@/server/db/schema";

export type ImportResult = Readonly<{ rows: number; created: number; updated: number }>;

export async function importCompanyCsv(scope: WorkspaceScope, input: string): Promise<ImportResult> {
  const rows = parseCompanyCsv(input);
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [run] = await tx.insert(discoveryRuns).values({
      workspaceId: scope.workspaceId,
      createdByUserId: scope.userId,
      provider: "csv",
      filters: { rows: rows.length },
    }).returning({ id: discoveryRuns.id });
    if (!run) throw new Error("Discovery run was not created");

    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const dedupeKey = companyDedupeKey(row);
      const [existing] = await tx.select({ id: companies.id }).from(companies).where(and(
        eq(companies.workspaceId, scope.workspaceId),
        eq(companies.dedupeKey, dedupeKey),
      )).limit(1);

      const values = {
        name: row.name,
        description: row.description ?? null,
        industry: row.industry ?? null,
        employeeEstimate: row.employee_estimate ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        province: row.province ?? null,
        postalCode: row.postal_code ?? null,
        countryCode: row.country_code ?? "ZA",
        website: row.website ?? null,
        domain: row.website ? new URL(row.website).hostname.toLowerCase().replace(/^www\./, "") : null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        whatsapp: row.whatsapp ?? null,
        facebookUrl: row.facebook_url ?? null,
        instagramUrl: row.instagram_url ?? null,
        linkedinUrl: row.linkedin_url ?? null,
        googleMapsUrl: row.google_maps_url ?? null,
        ratingHundredths: row.rating === undefined ? null : Math.round(row.rating * 100),
        reviewCount: row.review_count ?? null,
      };

      let companyId: string;
      if (existing) {
        const updates: Partial<typeof companies.$inferInsert> = {
          name: row.name,
          updatedAt: new Date(),
          ...(row.description !== undefined ? { description: row.description } : {}),
          ...(row.industry !== undefined ? { industry: row.industry } : {}),
          ...(row.employee_estimate !== undefined ? { employeeEstimate: row.employee_estimate } : {}),
          ...(row.address !== undefined ? { address: row.address } : {}),
          ...(row.city !== undefined ? { city: row.city } : {}),
          ...(row.province !== undefined ? { province: row.province } : {}),
          ...(row.postal_code !== undefined ? { postalCode: row.postal_code } : {}),
          ...(row.country_code !== undefined ? { countryCode: row.country_code } : {}),
          ...(row.website !== undefined ? { website: row.website, domain: new URL(row.website).hostname.toLowerCase().replace(/^www\./, "") } : {}),
          ...(row.phone !== undefined ? { phone: row.phone } : {}),
          ...(row.email !== undefined ? { email: row.email } : {}),
          ...(row.whatsapp !== undefined ? { whatsapp: row.whatsapp } : {}),
          ...(row.facebook_url !== undefined ? { facebookUrl: row.facebook_url } : {}),
          ...(row.instagram_url !== undefined ? { instagramUrl: row.instagram_url } : {}),
          ...(row.linkedin_url !== undefined ? { linkedinUrl: row.linkedin_url } : {}),
          ...(row.google_maps_url !== undefined ? { googleMapsUrl: row.google_maps_url } : {}),
          ...(row.rating !== undefined ? { ratingHundredths: Math.round(row.rating * 100) } : {}),
          ...(row.review_count !== undefined ? { reviewCount: row.review_count } : {}),
        };
        await tx.update(companies).set(updates).where(and(
          eq(companies.workspaceId, scope.workspaceId),
          eq(companies.id, existing.id),
        ));
        companyId = existing.id;
        updated += 1;
      } else {
        const [company] = await tx.insert(companies).values({ workspaceId: scope.workspaceId, dedupeKey, ...values }).returning({ id: companies.id });
        if (!company) throw new Error("Company was not created");
        companyId = company.id;
        created += 1;
      }

      const snapshot = Object.fromEntries(Object.entries(row).filter((entry): entry is [string, string | number] => entry[1] !== undefined));
      await tx.insert(companySources).values({
        workspaceId: scope.workspaceId,
        companyId,
        provider: "csv",
        sourceKey: companySourceKey(row),
        externalId: row.external_id ?? null,
        sourceUrl: row.source_url ?? null,
        confidence: "medium",
        kind: "user_supplied",
        observedAt: new Date(),
        snapshot,
      }).onConflictDoNothing({ target: [companySources.workspaceId, companySources.sourceKey] });
    }

    await tx.update(discoveryRuns).set({ status: "completed", resultCount: rows.length, completedAt: new Date() }).where(and(
      eq(discoveryRuns.workspaceId, scope.workspaceId),
      eq(discoveryRuns.id, run.id),
    ));
    await tx.insert(auditLogs).values({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      action: "prospecting.csv_imported",
      targetType: "discovery_run",
      targetId: run.id,
      metadata: { rows: rows.length, created, updated },
    });
    return { rows: rows.length, created, updated };
  });
}
