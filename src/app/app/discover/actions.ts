"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { CsvImportError, MAX_CSV_BYTES } from "@/modules/prospecting/csv";
import { getDatabase } from "@/server/db";
import { auditLogs, savedSearches } from "@/server/db/schema";
import { importCompanyCsv } from "@/server/prospecting/imports";
import { getWorkspaceContext } from "@/server/workspaces/context";

const savedSearchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  q: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  province: z.string().trim().max(120).optional(),
});

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function importCompanyCsvAction(_state: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a CSV file to import." };
  if (file.size > MAX_CSV_BYTES) return { status: "error", message: "CSV files must be 1 MB or smaller." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { status: "error", message: "Only .csv files are accepted." };
  const { scope } = await getWorkspaceContext("write");
  try {
    const result = await importCompanyCsv(scope, await file.text());
    revalidatePath("/app");
    revalidatePath("/app/discover/search");
    return { status: "success", message: `Processed ${result.rows} rows: ${result.created} created and ${result.updated} updated.` };
  } catch (error) {
    if (error instanceof CsvImportError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function saveCompanySearchAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = savedSearchSchema.safeParse({
    name: text(formData, "name"), q: text(formData, "q"), industry: text(formData, "industry"),
    city: text(formData, "city"), province: text(formData, "province"),
  });
  if (!parsed.success) return { status: "error", message: "Name the search using 2 to 80 characters." };
  const { scope } = await getWorkspaceContext("write");
  const [existing] = await getDatabase().select({ id: savedSearches.id }).from(savedSearches).where(and(
    eq(savedSearches.workspaceId, scope.workspaceId), eq(savedSearches.name, parsed.data.name),
  )).limit(1);
  if (existing) return { status: "error", message: "A saved search with that name already exists." };
  const filters = Object.fromEntries(Object.entries({ q: parsed.data.q, industry: parsed.data.industry, city: parsed.data.city, province: parsed.data.province }).filter((entry): entry is [string, string] => Boolean(entry[1])));
  await getDatabase().transaction(async (tx) => {
    const [saved] = await tx.insert(savedSearches).values({
      workspaceId: scope.workspaceId,
      createdByUserId: scope.userId,
      name: parsed.data.name,
      filters,
    }).returning({ id: savedSearches.id });
    await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "prospecting.search_saved", targetType: "saved_search", targetId: saved?.id });
  });
  revalidatePath("/app/discover/saved");
  return { status: "success", message: "Search saved to this workspace." };
}

export async function deleteSavedSearchAction(formData: FormData) {
  const id = text(formData, "id");
  if (!id || !z.uuid().safeParse(id).success) return;
  const { scope } = await getWorkspaceContext("write");
  await getDatabase().transaction(async (tx) => {
    const [deleted] = await tx.delete(savedSearches).where(and(eq(savedSearches.workspaceId, scope.workspaceId), eq(savedSearches.id, id))).returning({ id: savedSearches.id });
    if (deleted) await tx.insert(auditLogs).values({ workspaceId: scope.workspaceId, actorUserId: scope.userId, action: "prospecting.search_deleted", targetType: "saved_search", targetId: id });
  });
  revalidatePath("/app/discover/saved");
}
