import { eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { WorkspaceScope } from "@/modules/workspaces/scope";

export function tenantWhere(column: AnyPgColumn, scope: WorkspaceScope) {
  return eq(column, scope.workspaceId);
}
